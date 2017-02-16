/* global module:false, require:false */
(function() {
  'use strict';

  var $q = require('bluebird');
  var grunt = require('grunt');
  var $mongoDB = require('mongodb');

  var config = require('./../config.js');
  var $log = require('./../utils/log.js');

  var mongoClient = $mongoDB['MongoClient'];
  var mongoLogger = $mongoDB['Logger'];

  //Constructor
  function DBService() {
    var $this = this;

    //Set mongoLogger
    if (config['mongo']['mongoLoggerLevel']) {
      mongoLogger.setLevel(config['mongo']['mongoLoggerLevel']);
    }

    //Stores the database connection
    $this['database'] = null;

    //Connection string
    $this['connectionString'] = config['mongo']['connectionString'];

    //Connection options
    $this['connectionOptions'] = {
      'promiseLibrary': $q
    };
  }

  //Connects to the database
  DBService.prototype.connect = function () {
    var $this = this;

    //If is already connected
    if ($this['database'] != null) {
      return $q.resolve();
    }

    return mongoClient.connect($this['connectionString'], $this['connectionOptions']).then(function ($$database) {
      $this['database'] = $$database;
    });
  };

  //Closes the connection
  DBService.prototype.close = function () {
    var $this = this;

    if ($this['database'] !== null) {
      $this['database'].close();
      $this['database'] = null;
    }
  };


  //Singleton instance...
  var _instance = new DBService();

  module.exports = _instance;
})();