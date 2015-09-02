/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: simpleDataHolder", function() {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var scope, ctrl;

    beforeEach(inject(function ($rootScope, $controller) {
        scope = $rootScope.$new();
        scope.widget = {};
        ctrl = $controller('simpleDataHolder', {
            $scope: scope
        });
    }));

    it('should have a scope (just a sanity check)', function () {
        expect(scope).toBeDefined();
    });

    it('should start with value = null', function () {
        expect(scope.value).toBe(null);
    });

    it('should have an updateHandler function', function () {
        expect(scope.updateHandler).toBeDefined();
        expect(typeof scope.updateHandler).toBe("function");
    });

    it('should update value using updateHandler', function () {
        var newvalue = {timestamp: 1, value: "testValue"};
        scope.updateHandler(newvalue);
        expect(scope.value).toBe(newvalue.value);

        newvalue = {timestamp: 2, value: "testValue2"};
        scope.updateHandler(newvalue);
        expect(scope.value).toBe(newvalue.value);
    });

    it('should not update value when old data is received', function () {
        var first = {timestamp: 100, value: "aaa"};
        scope.updateHandler(first);
        expect(scope.value).toBe("aaa");

        var second = {timestamp: 80, value: "bbb"};
        scope.updateHandler(second);
        expect(scope.value).toBe("aaa");
    });

    it('should transform value appropriately when transformation is present', function () {
        scope.widget.transform = "val + 1";
        scope.updateHandler({timestamp: 1, value: 0});
        expect(scope.value).toBe(1);

        scope.updateHandler({timestamp: 2, value: 5});
        expect(scope.value).toBe(6);
    });

    it('should set value to NaN when transformation is bad', function () {
        scope.widget.transform = "BAAAH + x + new Date()";
        scope.updateHandler({timestamp: 1, value: 0});
        expect(scope.value).toBeNaN();

        // set value to something valid, to check resetting to NaN works
        scope.value = 0;
        scope.updateHandler({timestamp: 2, value: 1});
        expect(scope.value).toBeNaN();
    });
});

