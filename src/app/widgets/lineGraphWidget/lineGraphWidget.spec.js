/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: lineGraphWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element, history = [];
    // Fill 'history' array with some sample data
    for (var i = 0; i < 20; i++) {
        history.push({timestamp: new Date().getTime(), data: i});
    }
    // Add a piece of data past the initial data load cutoff, for code coverage
    // purposes
    history.push({timestamp: 10, data: 0});

    beforeEach(inject(function($rootScope, $compile, $httpBackend) {
        var outerscope = $rootScope.$new();
        element = angular.element('<div line-graph-widget="widget" />');
        outerscope.widget = {id: 1, type: "line-graph", device: "aaa", gets: "DIO0"};
        $compile(element)(outerscope);
        // The widget will automatically try to load the current state of its
        // data stream, so we need to expect that on the HTTP backend
        // (Restangular converts the / in the stream name to %2F)
        $httpBackend.expectGET("/api/devices/aaa/data/aaa%2FDIO0").
            respond({items: history});
        outerscope.$apply();
        $httpBackend.flush();
        scope = outerscope.$$childHead;
    }));

    afterEach(inject(function ($httpBackend) {
        $httpBackend.verifyNoOutstandingRequest();
        $httpBackend.verifyNoOutstandingExpectation();
    }));

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("line-graph");
    });

    it("should not allow Y-axis high value less than or equal to low value",
       inject(function (_widgetRegistry_, _utils_) {
        // Sanity check for settings validation, and boosts code coverage.
        var utils = _utils_;
        var registry = _widgetRegistry_;

        var defn = registry.get('line-graph');
        expect(defn).toBeDefined();

        // utils.verify_widget should throw an error on a widget with high
        // value <= low value
        var widget = {
            id: "a",
            type: "line-graph",
            label: "Line Graph",
            device: "A",
            gets: "DIO0",
            // ymax conform function should take an undefined ymin value as
            // ymin=0. (Leaving ymin out for code branch coverage completeness)
            //ymin: 100,
            // set ymax to 0 so that (ymin < ymax) is not satisfied
            ymax: 0
        };
        var expectedError = new Error("(ymax) High value must be greater than low value");
        expect(function () { utils.verify_widget(widget, defn); }).toThrow(expectedError);

        // Test again, but with ymin set, to cover the (implicit) 'else' branch
        // in ymax's conform function
        widget.ymin = 10;
        expect(function () { utils.verify_widget(widget, defn); }).toThrow(expectedError);
    }));
});

describe('Controller: lineGraphWidgetCtrl', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, ctrl;

    beforeEach(inject(function ($rootScope, $controller) {
        scope = $rootScope.$new();
        ctrl = $controller('lineGraphWidgetCtrl', {
            $scope: scope
        });
    }));

    it('should start with no data', function () {
        expect(scope.data).toEqual([]);
    });

    it('should add data points with addData', function () {
        var point = [10, 0];
        scope.addData(point);

        expect(scope.data.length).toBe(1);
        expect(scope.data[0]).toEqual(point);
    });

    it('should maintain sorted order by timestamp', function () {
        var i;
        // Originally set at 5000 - this causes testing delays though.
        // Besides, the tests passed when the count was that high, so it seems
        // a reasonable assumption that the code is working.
        var MAX_COUNT = 250;
        for (i = 0; i < MAX_COUNT; i++) {
            // Note: second item in data point (value) doesn't matter
            scope.addData([_.random(2500)]);
        }

        var previous = [-1];
        var outOfOrder = function (value) {
            var _prev = previous;
            previous = value;
            // Return true if any value is less than its predecessor.
            return (value[0] < _prev[0]);
        };

        expect(_.any(scope.data, outOfOrder)).toBe(false);
    });
});
