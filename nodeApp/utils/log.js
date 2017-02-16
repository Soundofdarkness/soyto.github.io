/* global console:true, require:true */
(function() {
  'use strict';

  var colors = require('colors');

  //Constructor
  function Logger() {
  }

  //Debug message
  Logger.prototype.debug = function () {
    var msg = arguments[0];
    var args = [];
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
    }

    console.log.apply(console.log, ['>>'.green + ' ' + msg].concat(args));
  };

  //Error message
  Logger.prototype.error = function () {
    var msg = arguments[0];
    var args = [];
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
    }

    console.log.apply(console.error, ['>>'.red + ' ' + msg].concat(args));
  };

  //Warn message
  Logger.prototype.warn = function () {
    var msg = arguments[0];
    var args = [];
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
    }

    console.warn.apply(console.log, ['>>'.yellow + ' ' + msg].concat(args));
  };


  //Singleton mode
  var _instance = new Logger();
  module.exports = _instance;
})();