/* global module:false, require:false */
(function() {
  'use strict';

  var Promise = require('bluebird');
  var grunt = require('grunt');
  var mongoose = require('mongoose');

  var config = require('./../config.js');
  var $log = require('./../utils/log.js');
  var schemas = require('./../schemas/');

  //Set bluebird as promise
  mongoose.Promise = require('bluebird');

  //Constructor
  function DBService() {
    var $this = this;


    /*  --------------------------------------  FIELDS  ------------------------------------------------------------  */

    /*  --------------------------------------  PROPERTIES  --------------------------------------------------------  */

    //Stores the database connection
    $this['connection'] = null;

    //Here we will store DB models
    $this['models'] = {};

    //Connection string
    $this['connectionString'] = config['mongo']['connectionString'];

    //Connection options
    $this['connectionOptions'] = {
      'promiseLibrary': Promise
    };

    //Call to init
    _init();

    /*  --------------------------------------  PUBLIC METHODS  ----------------------------------------------------  */

    //Connects to the database
    $this.connect = function () {

      //If is already connected
      if ($this['connection'] != null) {
        return Promise.resolve();
      }

      return new Promise(function(resolve, reject) {
        var _connection = mongoose.createConnection($this['connectionString'], $this['connectionOptions']);

        //On connection
        _connection.on('open', function(){
          _setConnectionListeners(_connection);
          _setUpModels(_connection);
          $this['connection'] = _connection;
          resolve();
        });

        //On error
        _connection.on('error', function(error) { reject(error); });
      });

    };

    //Close the database connection
    $this.close = function () {

      if($this['connection'] != null) {
        $this['connection'].close();
        $this['connection'] = null;
      }

    };

    /*  --------------------------------------  PRIVATE FUNCTIONS  -------------------------------------------------  */

    //Init function
    function _init() {

      //Set logger
      if (config['mongo']['debug']) {
        mongoose.set('debug', true);
        require('mongodb').Logger.setLevel('debug');
      }
    }

    //Sets the connection listeners
    function _setConnectionListeners(connection){
      connection.on('close', _connectionOnClose);
    }

    //Set up the models on this
    function _setUpModels(_connection) {
      Object.keys(schemas).forEach(function(key){
        $this['models'][key] = _connection.model(key, schemas[key]);
      });
    }

    /*  --------------------------------------  EVENTS  ------------------------------------------------------------  */

    //When connection is going to be closed
    function _connectionOnClose(){
      $log.warn('closing connection');
    }

  }

  //Singleton instance...
  var _instance = new DBService();

  module.exports = _instance;
})();