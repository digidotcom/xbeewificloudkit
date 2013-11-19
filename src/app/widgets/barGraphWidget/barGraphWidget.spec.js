/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: barGraphWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element;
    var pbScope;

    beforeEach(inject(function ($httpBackend) {
        $httpBackend.whenGET("/api/devices/AAA/data").respond({items: []});
        $httpBackend.expectGET("/api/devices/AAA/data");
    }));

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        element = angular.element('<div bar-graph-widget="widget" />');
        scope.widget = {device: "AAA", id: 1, type: "bar-graph", gets: "DIO0"};

        // Need to run $apply after this to make sure value watchers get
        // processed and thus, child scope values are modified.
        $compile(element)(scope);
        scope.$apply();

        scope = element.scope();
        //scope.$apply();
        pbScope = scope.$$childHead;
    }));

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("bar-graph");
        expect(scope.widget.gets).toBe("DIO0");
    });

    it('should start with value undefined', function () {
        expect(pbScope.value).toBe(undefined);
    });

    it('should update value when dataUpdate is called', function() {
        scope.$apply(function () {
            scope.updateHandler({timestamp: 50, value: 600});
        });
        expect(pbScope.value).toBe(600);
    });

    it("should not allow high value less than or equal to low value", inject(function (_widgetRegistry_, _utils_) {
        // Sanity check for settings validation, and boosts code coverage.
        var utils = _utils_;
        var registry = _widgetRegistry_;

        var defn = registry.get('bar-graph');
        expect(defn).toBeDefined();

        // utils.verify_widget should throw an error on a widget with high
        // value <= low value
        var widget = {
            id: "a",
            type: "bar-graph",
            label: "Bar Graph",
            device: "A",
            gets: "DIO0",
            low: 100,
            high: 99
        };
        var expectedError = new Error("(high) High value must be greater than low value");
        expect(function () { utils.verify_widget(widget, defn); }).toThrow(expectedError);
    }));
});
