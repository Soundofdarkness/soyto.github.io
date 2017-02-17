/* global require: false */
(function(){
  'use strict';

  var mongoose = require('mongoose');

  //Set blueburd as promise
  mongoose.Promise = require('bluebird');


  var Schema = mongoose.Schema;

  var _topHp = {
    'ID': Number,
    'characterName': String,
    'gloryPointChange': Number
  };

  var _topPositionChange = {
    'ID': Number,
    'characterName': String,
    'positionChange': Number
  };

  var ServerDataSchema = new Schema({
    'date': String,
    'name': String,
    'stats': {
      'asmodians': {
        'topHP': _topHp,
        'topPositionChange': _topPositionChange
      },
      'elyos': {
        'topHP': _topHp,
        'topPositionChange': _topPositionChange
      }
    },
    'characters': [{
      'ID': Number,
      'name': String,

      'guild': {
        'name': String,
        'ID': Number,
        'level': Number,
        'masterName': String,
        'memberCount': Number,
        'contributionPoints': Number,
      },

      'raceID': Number,
      'classID': Number,

      'gloryPoints': Number,
      'position': Number,
      'rankID': Number,
      'positionChange': Number,
      'gloryPointChange': Number
    }],

    'previousDate': String,
    'nextDate': String
  });

  ServerDataSchema.index({'date': 1, 'name': 1}, {'unique': true});


  module.exports = ServerDataSchema;
})();