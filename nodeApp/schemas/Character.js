/* global require: false */
(function() {
  'use strict';

  var mongoose = require('mongoose');

  //Set blueburd as promise
  mongoose.Promise = require('bluebird');
  var Schema = mongoose.Schema;

  var CharacterSchema = new Schema({
    'ID': Number,
    'server': String,
    'name': String,

    'guild': {
      'name': String,
      'ID': Number,
    },

    'raceID': Number,
    'classID': Number,

    'gloryPoints': Number,
    'position': Number,
    'rankID': Number,
    'positionChange': Number,
    'gloryPointChange': Number,

    'guilds': [{
      'date': String,
      'ID': Number,
      'name': String
    }],
    'names': [{
      'date': String,
      'name': String
    }],
    'status': [{
      'date': String,
      'gloryPoints': Number,
      'position': Number,
      'rankID': Number,
      'positionChange': Number,
      'gloryPointChange': Number,
    }]
  });

  CharacterSchema.index({'ID': 1, 'String': 1}, {'unique': true});


  module.exports = CharacterSchema;

})();