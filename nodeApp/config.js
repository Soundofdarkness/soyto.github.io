/* global require */
(function(){
  'use strict';

  var grunt = require('grunt');

  var _config = {

    'crawler': {
      'user-agent': 'soyto.github.io crawler',
    },

    'application': {
      'base-folder': 'data',
      'posts-folder': '_posts/',
      'app-folder': 'app/',
      'app-files': null,
      'node-app-files': null,
      'concat-dest': 'dst/app.js',
      'uglify-dest': 'dst/app.min.js'
    },

    'mongo': {
      'connectionString': 'mongodb://localhost:27017/soyto',
      'mongoLoggerLevel': 'error'
    }
  };

  _config['application']['app-files'] = grunt.file.expand('app/**/*.js');
  _config['application']['node-app-files'] = grunt.file.expand('nodeApp/**/*.js');


  module.exports = _config;
})();