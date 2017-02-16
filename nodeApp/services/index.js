/* global require: false, __dirname: false*/
(function(){

  var grunt = require('grunt');

  var $log = require('./../utils/log.js');

  var _services = {};

  grunt.file.expand(__dirname + '/*.js').forEach(function($$file){
    var _fileName = $$file.substr(__dirname.length + 1);

    //If is index, dont do nothing
    if(_fileName == 'index.js'){ return; }

    var _serviceName = _fileName.substr(0, _fileName.length - 3);

    _services[_serviceName] = require($$file);
  });



  module.exports = _services;
})();