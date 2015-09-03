module.exports = new function() {
  'use strict';

  var NUM_PAGES_PER_SERVER = 1;

  var $q        = require('q');
  var $log      = require('../nodeApp/log');
  var request   = require('request');
  var colors    = require('colors');
  var extend    = require('util')._extend;
  var grunt      = require('grunt');

  require('../lib/javascript.extensions.js');

  var  $this = this;

  //List of all servers
  $this.servers = [
    {id : 47, name: 'Alquima'},
    {id : 46, name: 'Anuhart'},
    {id : 39, name: 'Balder'},
    {id : 49, name: 'Barus'},
    {id : 45, name: 'Calindi'},
    {id : 48, name: 'Curatus'},
    {id : 36, name: 'Kromede'},
    {id : 44, name: 'Nexus'},
    {id : 34, name: 'Perento'},
    {id : 31, name: 'Spatalos'},
    {id : 42, name: 'Suthran'},
    {id : 32, name: 'Telemachus'},
    {id : 37, name: 'Thor'},
    {id : 40, name: 'Urtem'},
    {id : 43, name: 'Vehalla'},
    {id : 51, name: 'Zubaba'},
  ];

  //Performs login action and returns the cookie
  $this.login = function(username, password, userAgent) {
    var $$q = $q.defer();

    $log.debug('Performin login');

    var requestData = {
      method: 'POST',
      uri: 'https://en.aion.gameforge.com/website/login/',
      headers: {
        'user-agent': userAgent
      },
      form: {
        loginForm: 'loginForm',
        username: username,
        password: password,
      }
    };

    var onRequestFn = function(error, response, body) {
      if(response['headers']['set-cookie']) {
	       $$q.resolve(response['headers']['set-cookie'][0].split(';')[0]);
	    }
      else {
	       $$q.reject('Coulnd\'t login');
	    }
    };


    request(requestData, onRequestFn);

    return $$q.promise;
  };

  //Retrieves one server
  $this.retrieveServer = function(serverName, serverId, cookie, userAgent) {
    $log.debug('Extracting [%s]', colors.cyan(serverName));

    var results = {
      elyos: [],
      asmodians: [],
      errors: []
    };

    var requestData = {
      characterClassID: ['1', '2',  '4', '5', '7', '8', '10', '11' , '13', '14' , '16'],
      raceID: [],
      serverID: [serverId],
      soldierRankID: null,
      sortBy: 'POSITION',
      order: 'ASC'
    };

    var $$q = $q.resolve();

    var indexes = Array.apply(null, {length: NUM_PAGES_PER_SERVER}).map(Number.call, Number);

    //Extract  elyos data
    indexes.forEach(function(i) {

      var _requestData = extend({}, requestData);
      _requestData.raceID = [0];

      $$q = $$q.then(function(){
        return $this
          .retrievePage(serverName, i, _requestData, cookie, userAgent)
          .then(function(data) {

            if(data.error) {
              results.errors.push({
                pageNum: i,
                faction: 0,
                error: data.error
              });
            }
            else {
              data.entries.forEach(function(entry){
                results.elyos.push(entry);
              });
            }
        });
      });
    });

    //Extract asmodian data
    indexes.forEach(function(i) {

      var _requestData = extend({}, requestData);
      _requestData.raceID = [1];

      $$q = $$q.then(function(){
        return $this
          .retrievePage(serverName, i, _requestData, cookie, userAgent)
          .then(function(data) {

            if(data.error) {
              results.errors.push({
                pageNum: i,
                faction: 1,
                error: data.error
              });
            }
            else {
              data.entries.forEach(function(entry){
                results.asmodians.push(entry);
              });
            }
        });
      });
    });

    //When all is over
    return  $$q.then(function(){
      var sortFn = function(a, b) { return a.position - b.position; };

      results.elyos = results.elyos.sort(sortFn);
      results.asmodians = results.asmodians.sort(sortFn);

      return {
        serverName: serverName,
        serverId: serverId,
        entries: {
          elyos: results.elyos,
          asmodians: results.asmodians
        },
        errors: results.errors
      };
    });
  };

  //Retrieves one page
  $this.retrievePage = function(serverName, pageNum, data, cookie, userAgent) {
    var $$q = $q.defer();

    var page = pageNum + 1;
    var race_str_colored = data.raceID[0] == '0' ? colors.green('Elyos') : colors.magenta('Asmodian');

    var requestData = {
      method: 'POST',
      uri: 'https://en.aion.gameforge.com/website/resources/pubajax/ranking/honorpoints/paging/' + pageNum + '/',
      timeout: 10000,
      headers: {
        'user-agent': userAgent,
        'cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest'
      },
      json: data
    };

    var responseFn = function(error, response, body) {

      //Object with the response
      var response = {
        entries: [],
        error: null,
        serverName: serverName,
        pageNum: pageNum,
        data: data
      };

      //If body is a string we are on a badFormat
      if(typeof body == 'string' && !error) {
        error = {
          code: 'BADFORMAT'
        }
      }

      if(error) {

        if(error.code == 'ETIMEDOUT') {
          $log.debug('[%s:%s] ---- %s', colors.cyan(serverName), colors.yellow(pageNum + 1), colors.yellow('TIMEOUT'));
          $this.retrievePage(serverName, pageNum, data, cookie, userAgent).then($$q.resolve);
        }
        else if(error.code == 'BADFORMAT') {
          $log.debug('[%s:%s] ---- %s', colors.cyan(serverName), colors.yellow(pageNum + 1), colors.red('BAD FORMAT'));

          response.error = {
            msg: 'BADFORMAT'
          };

          $$q.resolve(response);
        }
        else {
          response.error = error;
          $$q.reject(response);
        }
      }
      else {

        if(!body.entries) {
          $log.debug(JSON.stringify(body));
        }

        $log.debug('[%s:%s-%s] >>>> Downloaded %s characters',
          colors.cyan(serverName),
          colors.yellow(pageNum + 1),
          race_str_colored,
          colors.green(body.entries.length)
        );

        response.entries = body.entries;

        $$q.resolve(response);
      }
    };

    //Perform the request
    request(requestData, responseFn);

    return $$q.promise;
  };

  //Will create all players database
  $this.createPlayersDatabase = function() {

    var serversFile = [];

    $this.servers.forEach(function(server){
      serversFile.push({
        server: server,
        files: grunt.file.expand('data/*/' + server.name + '.json')
      });
    });
    //Now we have files ordered per server


  };
}();
