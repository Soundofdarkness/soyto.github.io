/* global require */
module.exports = function(grunt){

  var $log = require('./../utils/log.js');
  var $dbService = require('./../services/')['DB'];
  var $filesDB = require('./../services/')['FilesDB'];




  grunt.registerTask('filesDB-fill-mongoDB', 'fills mongoDB database', function(){
    var _done = this.async();
    $dbService.connect().then(function(){

      $filesDB.getAllServerFilesStructured().forEach(function($$server){
        $log.debug($$server['name']);
      });

      _done();
    }).catch(function(error){
      $log.error('Error trying to connect -> %s', error['message']);
      _done();
    });

  });



};