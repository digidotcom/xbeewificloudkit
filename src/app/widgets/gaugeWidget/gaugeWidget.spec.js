/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: gaugeWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element, gaugeScope;

    beforeEach(inject(function ($httpBackend) {
        $httpBackend.whenGET("/api/devices/AAA/data").respond({items: []});
        $httpBackend.expectGET("/api/devices/AAA/data");
    }));

    beforeEach(inject(function($rootScope, $compile) {
        var outerscope = $rootScope.$new();
        element = angular.element('<div gauge-widget="widget"></div>');
        // Append the element to document.body, because Karma doesn't do that
        // for us. The widget, or at least the div within the gauge directive
        // template, needs to be present within the document in order for
        // justGage to function properly.
        $(element).appendTo(document.body);
        outerscope.widget = {device: "AAA", id: 1, type: "gauge", gets: "DIO0"};
        $compile(element)(outerscope);
        outerscope.$apply();

        // the gauge-widget directive creates a new isolate scope within
        // outerscope - so we need to get a reference to it
        scope = outerscope.$$childHead;

        gaugeScope = angular.element($(element).find(".widget-gauge"))
                                .scope().$$childHead;
    }));

    it('should be able to find the gauge', function () {
        expect(gaugeScope).not.toBeUndefined();
    });

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("gauge");
        expect(scope.widget.gets).toBe("DIO0");
    });

    it('should have correct gaugeScope parent (SCOPE OF TESTING)', function () {
        expect(scope.$$childHead.$id).toBe(gaugeScope.$id);
    });

    it('should have the correct default starting value', function() {
        expect(gaugeScope).toBeDefined();
        expect(gaugeScope.value).toBe(undefined);
    });

    it('should have the gauge update correctly on update', function() {
        scope.$apply(function () {
            scope.value = 40;
        });

        expect(gaugeScope.value).toBe(40);
    });

    it("should not allow high value less than or equal to low value", inject(function (_widgetRegistry_, _utils_) {
        // Sanity check for settings validation, and boosts code coverage.
        var utils = _utils_;
        var registry = _widgetRegistry_;

        var defn = registry.get('gauge');
        expect(defn).toBeDefined();

        // utils.verify_widget should throw an error on a widget with high
        // value <= low value
        var widget = {
            id: "a",
            type: "gauge",
            label: "Gauge",
            device: "A",
            gets: "DIO0",
            low: 100,
            high: 99
        };
        var expectedError = new Error("(high) High value must be greater than low value");
        expect(function () { utils.verify_widget(widget, defn); }).toThrow(expectedError);
    }));
});
