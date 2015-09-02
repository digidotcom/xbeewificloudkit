/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Controller: DashboardFooterCtrl', function () {
    var state, scope, ctrl;
    beforeEach(module("XBeeWiFiApp"));

    beforeEach(inject(function ($rootScope, $controller) {
        state = {transitionTo: jasmine.createSpy("transitionTo function")}
        scope = $rootScope.$new();
        ctrl = $controller('DashboardFooterCtrl', {
            $scope: scope, $state: state
        });
    }));

    it("should call $state.transitionTo('add_widget') on addWidget", function () {
        scope.addWidget();
        expect(state.transitionTo).toHaveBeenCalledWith("add_widget");
    });
});
