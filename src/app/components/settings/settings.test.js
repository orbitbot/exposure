describe('SettingsCtrl', function() {

  beforeEach(function() {
    module('exposure');
  });

  var ctrl, scope;

  beforeEach(inject(function($controller, $rootScope) {
    scope = $rootScope.$new();
    ctrl = $controller('SettingsCtrl', {
      $scope: scope
    });
  }));

  it('offers toggles and other stuff');

});