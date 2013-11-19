/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: loginPageCtrl", function () {
    beforeEach(module("XBeeWiFiApp"));

    var scope, api, utils;
    beforeEach(inject(function ($controller, $rootScope) {
        scope = $rootScope.$new();
        api = {
            login: jasmine.createSpy("login mock")
        };
        utils = {
            setTitle: jasmine.createSpy("setTitle mock")
        };
        $controller("loginPageCtrl", {
            $scope: scope, cloudKitApi: api, utils: utils
        });
    }));

    it("should have an authenticate method on scope", function () {
        expect(scope.authenticate).toBeDefined();
        expect(typeof scope.authenticate).toBe("function");
    });

    it("should call utils.setTitle on initialization", function () {
        expect(utils.setTitle).toHaveBeenCalledWith("Login");
    });

    it("should call cloudKitApi.login on authenticate()", function () {
        scope.authenticate("username", "password", "cloud", false);
        expect(api.login).toHaveBeenCalledWith("username", "password", "cloud", false);
    });
});
