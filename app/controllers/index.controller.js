(function(ng){
  'use strict';

  var CONTROLLER_NAME = 'mainApp.index.controller';

  ng.module('mainApp').controller(CONTROLLER_NAME, [
    '$scope', 'helperService', 'storedDataService', index_controller
  ]);


  function index_controller($scope, helperService, storedDataService) {
    $scope._name = CONTROLLER_NAME;
    $scope.servers = storedDataService.serversList;
    $scope.lastServerUpdateData = storedDataService.getLastServerData();

    helperService.$scope.setTitle('Soyto.github.io');
    helperService.$scope.setNav('home');
  }
})(angular);
