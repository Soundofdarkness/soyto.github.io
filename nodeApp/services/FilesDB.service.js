/* global require:false */
(function(){
  'use strict';

  var grunt = require('grunt');


  var config = require('./../config.js');
  var $log = require('./../utils/log.js');


  function FilesDBService(){
    var $this = this;
  }

  //List all Dates folders that the application currently has
  FilesDBService.prototype.listDatesFolders = function(){
    var $this = this;

    var _baseFolder = config['application']['base-folder'] + '/Servers/';
    var _dates = [];


    grunt.file.expand(_baseFolder + '*').forEach(function($$folder){
      var _folderName = $$folder.substr(_baseFolder.length);

      //We dont want to list character folder
      if(_folderName == 'Characters') { return; }

      _dates.push($$folder);
    });

    _dates.sort(function(a, b) {
      var _folderNameA = a.substr(_baseFolder.length);
      var _folderNameB = b.substr(_baseFolder.length);

      return (new Date(_folderNameA)).getTime() - (new Date(_folderNameB)).getTime();
    });

    return _dates;
  };

  //Retrieve all server files on a structure like
  // -[{name: xxx, Dates: [{date: xxx, file: xxx}, ..]}, ...]
  FilesDBService.prototype.getAllServerFilesStructured = function(){
    var $this = this;

    var _baseFolder = config['application']['base-folder'] + 'Servers/';

    var _results = [];
    var _wholeFiles = [];

    $this.listDatesFolders().forEach(function($$dateFolder){
      var _files = grunt.file.expand($$dateFolder + '/*.json');
      _wholeFiles = _wholeFiles.concat(_files);
    });

    _wholeFiles.forEach(function($$file){
      var _date = $$file.substr(_baseFolder.length).split('/')[1];
      var _serverName = $$file.substr(_baseFolder.length).split('/')[2].split('.')[0];

      var _serverData = _results.first(function(x){ return x['name'] == _serverName; });

      //No server data yet? create it
      if(!_serverData) {
        _serverData = {
          'name': _serverName,
          'dates': []
        };

        _results.push(_serverData);
      }

      //Add the date
      _serverData['dates'].push({
        'date': _date,
        'file': $$file
      });
    });

    //Loop servers
    _results.forEach(function($$server){
      $$server['dates'].sort(function(a, b){
        return (new Date(a)).getTime() - (new Date(b)).getTime();
      });
    });

    return _results;
  };


  var _instance = new FilesDBService();
  module.exports = _instance;
})();