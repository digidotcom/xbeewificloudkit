/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Controller: DashboardPageController', function () {
    var utils, scope, ctrl;
    beforeEach(module("XBeeWiFiApp"));

    beforeEach(inject(function ($rootScope, $controller) {
        utils = {setTitle: jasmine.createSpy("setTitle spy")};
        scope = $rootScope.$new();
        ctrl = $controller('DashboardPageController', {
            $scope: scope, utils: utils
        });
    }));

    it("should call utils.setTitle('Dashboard')", function () {
        expect(utils.setTitle).toHaveBeenCalledWith("Dashboard");
    });
});

