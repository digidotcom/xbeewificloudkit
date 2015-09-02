/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: landingCtrl", function () {
    beforeEach(module("XBeeWiFiApp"));

    var api, state, scope;

    beforeEach(inject(function ($rootScope, $controller, $q) {
        api = {
            user: jasmine.createSpy("user").andCallFake(function () {
                var deferred = $q.defer();
                deferred.resolve();
                return deferred.promise;
            })
        };
        state = {
            go: jasmine.createSpy("go")
        };
        scope = $rootScope.$new();
        $controller("landingCtrl", {
            $scope: scope, $state: state, cloudKitApi: api
        });
    }));

    it("should call cloudKitApi.user()", function () {
        expect(api.user).toHaveBeenCalled();
    });

    it("should call $state.go('dashboard') on successful user() call", function () {
        // Needed to trigger deferred callbacks
        scope.$digest();
        expect(state.go).toHaveBeenCalledWith("dashboard");
    });
});
