/* global require */
module.exports = function(grunt){


  var Promise = require('bluebird');

  var $log = require('./../utils/log.js');
  var $dbService = require('./../services/')['DB'];
  var $filesDB = require('./../services/')['FilesDB'];


  //Populates mongoDB
  grunt.registerTask('filesDB-fill-mongoDB', 'fills mongoDB database', function() {
    var _done = this.async();
    $dbService.connect().then(function(){

      var _serverModel = $dbService['models']['Server'];

      var _servers = $filesDB.getAllServerFilesStructured();

      var $$q = Promise.resolve();

      _servers.forEach(function($$server) {
        var _serverName = $$server['name'];
        var _prevDoc = null;

        $$server['dates'].forEach(function($$date, $index) {
          var _date = $$date['date'];

          $$q = $$q.then(function() {
            var _timeControl = (new Date()).getTime();
            var _wholeData = grunt.file.readJSON($$date['file']);
            var _characters = _wholeData['asmodians'].concat(_wholeData['elyos']).select(_transformCharacter);

            //Sort characters
            _characters.sort(function(a, b){
              if(a['position'] != b['position']) {
                return a['position'] - b['position'];
              }

              return b['raceID'] - a['raceID'];
            });

            //Extract entry from database
            return _serverModel.findOne({'name': _serverName, 'date': _date}).exec().then(function($$document) {

              //If document doesnt exists... create it
              if($$document == null) {
                /* jshint-W055 */
                $$document = new _serverModel({
                  'name': _serverName,
                  'date': _date,
                  'characters': _characters,
                  'previousDate': null,
                  'nextDate': null,
                  'stats': null
                });
                /* jshint+W055 */
              }

              //If we has a previous document for that server
              if(_prevDoc != null) {

                $$document['previousDate'] = _prevDoc['date'];

                _prevDoc['nextDate'] = _date;

                //Calculates each character progression
                _calculateCharacterProgression($$document, _prevDoc);

                //Retrieves which are the top scorers
                _getTopScorers($$document);
              }

              //Save document
              return $$document.save().then(function($$dbDocument){

                //Store oldDocument
                var _oldDoc = _prevDoc;
                _prevDoc = $$dbDocument;

                //Save oldDocument
                return (_oldDoc != null ? _oldDoc.save() : Promise.resolve()).then(function(){
                  $log.debug('[%s-%s] Document created [%s:%s] in %sms',
                      $index + 1, $$server['dates'].length,
                      $$dbDocument['name'], $$dbDocument['date'], (new Date()).getTime() - _timeControl);
                });
              });
            });
          });
        });
      });

      $$q.finally(function(){
        $dbService.close();
      });

      return $$q;

    }).catch(function(error) {
      $log.error('Error trying to connect -> %s', error['message']);
    }).finally(_done);

    //Trasnforms a character
    function _transformCharacter(character) {
      return {
        'ID': character['characterID'],
        'name': character['characterName'],

        'guild': {
          'name': character['guildName'],
          'ID': character['guildID'],
          'level': character['guildLevel'],
          'masterName': character['masterName'],
          'memberCount': character['memberCount'],
          'contributionPoints': character['contributionPoint'],
        },

        'raceID': character['raceID'],
        'classID': character['characterClassID'],

        'gloryPoints': character['gloryPoint'],
        'position': character['position'],
        'rankID': character['soldierRankID'],

        'positionChange': null,
        'gloryPointChange': null
      };
    }

    //Calculates character progression for current schema
    function _calculateCharacterProgression(currentSchema, oldSchema) {
      currentSchema['characters'].forEach(function($$currentChar) {
        var _oldCharacters = oldSchema['characters'];

        var _oldChar = _oldCharacters.first(function(x){ return x['ID'] == $$currentChar['ID']; });
        if(!_oldChar) { return; }

        $$currentChar['positionChange'] = $$currentChar['position'] - _oldChar['position'];
        $$currentChar['gloryPointChange'] = $$currentChar['gloryPoints'] - _oldChar['gloryPoints'];
      });
    }

    //Retrieve top server scorers
    function _getTopScorers(currentSchema) {
      var _asmodians = currentSchema['characters'].where(function(x){ return x['raceID'] == 1; });
      var _elyos = currentSchema['characters'].where(function(x){ return x['raceID'] == 0; });

      var _topAsmodianGpChange = _asmodians.max(function(x){ return x['gloryPointChange']; });
      var _topAsmodianPositionChange = _asmodians.max(function(x){ return x['positionChange']; });

      var _topElyosGpChange = _elyos.max(function(x){ return x['gloryPointChange']; });
      var _topElyosPositionChange = _elyos.max(function(x){ return x['positionChange']; });


      currentSchema['stats'] = {
        'asmodians': {
          'topHP': {
            'ID': _topAsmodianGpChange['ID'],
            'characterName': _topAsmodianGpChange['name'],
            'gloryPointChange': _topAsmodianGpChange['gloryPointChange']
          },
          'topPositionChange': {
            'ID': _topAsmodianPositionChange['ID'],
            'characterName': _topAsmodianPositionChange['name'],
            'positionChange': _topAsmodianPositionChange['positionChange']
          }
        },
        'elyos': {
          'topHP': {
            'ID': _topElyosGpChange['ID'],
            'characterName': _topElyosGpChange['name'],
            'gloryPointChange': _topElyosGpChange['gloryPointChange']
          },
          'topPositionChange': {
            'ID': _topElyosPositionChange['ID'],
            'characterName': _topElyosPositionChange['name'],
            'positionChange': _topElyosPositionChange['positionChange']
          }
        }
      };
    }
  });

};