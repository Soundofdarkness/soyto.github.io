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
      var _characterModel = $dbService['models']['Character'];

      var _servers = $filesDB.getAllServerFilesStructured();

      var $$q = Promise.resolve();

      _servers.forEach(function($$server) {
        var _serverName = $$server['name'];
        var _prevDoc = null;

        $$server['dates'].forEach(function($$date, $index) {
          var _date = $$date['date'];

          var _startTime = null;

          $$q = $$q.then(function(){
            _startTime = (new Date()).getTime();
          });

          //Store server
          $$q = $$q.then(function() {
            var _wholeData = grunt.file.readJSON($$date['file']);
            var _characters = _wholeData['asmodians'].concat(_wholeData['elyos']).select(_transformCharacterForRanking);

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
                return (_oldDoc != null ? _oldDoc.save() : Promise.resolve($$dbDocument)).then(function(){
                  return $$dbDocument;
                });
              });
            });
          });

          //Now store characters on the server
          $$q = $$q.then(function($$serverDocument){
            var _$q = Promise.resolve();

            $$serverDocument['characters'].forEach(function($$character){
              _$q = _$q.then(function(){

                //Look if this character exists
                return _characterModel.findOne({'ID': $$character['ID'], 'server': $$serverDocument['name']}).exec().then(function($$dbCharacter){

                  //Character doesnt exists? create it
                  if($$dbCharacter == null) {
                    /* jshint-W055 */
                    $$dbCharacter = new _characterModel({
                      'ID': $$character['ID'],
                      'server': $$serverDocument['name'],
                      'name': $$character['name'],

                      'guild': {
                        'name': $$character['guild']['name'],
                        'ID': $$character['guild']['ID'],
                      },

                      'raceID': $$character['raceID'],
                      'classID': $$character['classID'],

                      'gloryPoints': $$character['gloryPoints'],
                      'position': $$character['position'],
                      'rankID': $$character['rankID'],
                      'positionChange': $$character['positionChange'],
                      'gloryPointChange': $$character['gloryPointChange'],

                      'guilds': [{
                        'date': $$serverDocument['date'],
                        'ID': $$character['guild']['ID'],
                        'name': $$character['guild']['name']
                      }],
                      'names': [{
                        'date': $$serverDocument['date'],
                        'name': $$character['name']
                      }],
                    });
                    /* jshint+W055 */
                  }

                  //Was changed his name?
                  _processCharacterNameChanges($$dbCharacter, $$character, $$serverDocument['date']);

                  //Was changed his guild?
                  _processCharacterGuildChange($$dbCharacter, $$character, $$serverDocument['date']);

                  //Process character new status
                  _processCharacterNewStatus($$dbCharacter, $$character, $$serverDocument['date']);


                  return $$dbCharacter.save();
                });
              });
            });

            return _$q;
          });

          $$q = $$q.then(function(){
            var _now = (new Date()).getTime();
            var _time = _now - _startTime;


            $log.debug('Stored %s:%s on %sms', _serverName, _date, _time);
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
    function _transformCharacterForRanking(character) {
      var _result = {
        'ID': character['characterID'],
        'name': character['characterName'],

        'guild': null,

        'raceID': character['raceID'],
        'classID': character['characterClassID'],

        'gloryPoints': character['gloryPoint'],
        'position': character['position'],
        'rankID': character['soldierRankID'],

        'positionChange': null,
        'gloryPointChange': null
      };

      //Character has guild?
      if(character['guildName'] && character['guildID']) {
        _result['guild'] = {
          'name': character['guildName'],
          'ID': character['guildID'],
          'level': character['guildLevel'],
          'masterName': character['masterName'],
          'memberCount': character['memberCount'],
          'contributionPoints': character['contributionPoint'],
        };
      }


      return _result;
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
      var _asmodians = currentSchema['characters'].where(function(x){ return x['raceID'] === 1; });
      var _elyos = currentSchema['characters'].where(function(x){ return x['raceID'] === 0; });

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

    //Process if character has a name change
    function _processCharacterNameChanges(dbCharacter, newCharacter, currentDate) {
      if(dbCharacter['name'] != newCharacter['name']) {
        dbCharacter['name'] = newCharacter['name'];

        dbCharacter['names'].unshift({
          'date': currentDate,
          'name': newCharacter['name']
        });
      }
    }

    //Porcess if character has new guild
    function _processCharacterGuildChange(dbCharacter, newCharacter, currentDate){

      var _newGuildID = newCharacter['guild'] == null ? null : newCharacter['guild']['ID'];
      var _oldGuildID = dbCharacter['guild'] == null ? null : dbCharacter['guild']['ID'];

      if(_newGuildID == _oldGuildID) { return; }


      //Set up the new guild
      if(_newGuildID != null) {
        dbCharacter['guild'] = {
          'name': newCharacter['guild']['name'],
          'ID': newCharacter['guild']['ID']
        };
      }
      else {
        dbCharacter['guild'] = null;
      }

      //Has an entry for today?
      var _guildEntry = dbCharacter['guilds'].first(function(x){ return x['date'] == currentDate; });

      //If we had an entry, update it
      if(_guildEntry != null) {
        if(_newGuildID != null) {
          _guildEntry['ID'] = newCharacter['guild']['ID'];
          _guildEntry['name'] = newCharacter['guild']['name'];
        }
        else {
          _guildEntry['ID'] = null;
          _guildEntry['name'] = null;
        }
      }
      else { //Create the new entry

        if(_newGuildID != null) {
          _guildEntry = {
            'ID': newCharacter['guild']['ID'],
            'name': newCharacter['guild']['name'],
            'date': currentDate
          };
        }
        else {
          _guildEntry = {
            'ID': newCharacter['guild']['ID'],
            'name': newCharacter['guild']['name'],
            'date': currentDate
          };
        }

        dbCharacter['guilds'].unshift(_guildEntry);
      }

    }

    //Process character new status...
    function _processCharacterNewStatus(dbCharacter, newCharacter, currentDate) {

      var _status = dbCharacter['status'].first(function(x){ return x['date'] == currentDate; });

      //If we have an entry, just update it
      if(_status != null) {
        _status['gloryPoints'] = newCharacter['gloryPoints'];
        _status['position'] = newCharacter['position'];
        _status['rankID'] = newCharacter['rankID'];
        _status['positionChange'] = newCharacter['positionChange'];
        _status['gloryPointChange'] = newCharacter['gloryPointChange'];
      }
      else {
        _status = {
          'date': currentDate,
          'gloryPoints': newCharacter['gloryPoints'],
          'position': newCharacter['position'],
          'rankID': newCharacter['rankID'],
          'positionChange': newCharacter['positionChange'],
          'gloryPointChange': newCharacter['gloryPointChange'],
        };

        dbCharacter['status'].unshift(_status);
      }

      //Update dbCharacter profile status
      dbCharacter['gloryPoints'] = newCharacter['gloryPoints'];
      dbCharacter['position'] = newCharacter['position'];
      dbCharacter['rankID'] = newCharacter['rankID'];
      dbCharacter['positionChange'] = newCharacter['positionChange'];
      dbCharacter['gloryPointChange'] = newCharacter['gloryPointChange'];
    }
  });

};