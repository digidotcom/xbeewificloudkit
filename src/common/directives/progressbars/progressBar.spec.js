/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

// Test horizontal progress bars
describe('Directive: progressBar (horizontal)', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element;

    // Add a matcher to compare strings and numbers for equality
    // (because Jasmine apparently doesn't do that)
    beforeEach(function () {
        var toEqualNumber = function (expected) {
            var actual = this.actual;
            this.message = function () {
                return "Expected " + actual + " to be equal to the number " + expected;
            }

            if (typeof actual === "string" || typeof actual === "number") {
                // Cast to number
                actual = +actual;
            } else {
                // Do nothing with 'actual'
            }

            return actual === expected;
        };
        this.addMatchers({toEqualNumber: toEqualNumber});

        // Some preliminary tests of the toEqualNumber matcher.
        var obj = {actual: 0};
        var rv = toEqualNumber.apply(obj, [0]);
        expect(rv).toBe(true);
        expect(obj.message).toBeDefined();
        expect(obj.message()).toBe("Expected 0 to be equal to the number 0");
        // For code coverage: test else-branch in toEqualNumber
        obj.actual = {};
        expect(toEqualNumber.apply(obj, [0])).toBe(false);
        expect(obj.message()).toBe("Expected [object Object] to be equal to the number 0");
    });

    var buildElement = function (attrs) {
        var el = angular.element('<div progress-bar ng-model="value"></div>');
        for (var key in attrs) {
            el.attr(key, attrs[key]);
        }
        return el;
    }

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        var attrs = {
            low: "{{low}}",
            high: "{{high}}",
            value: "value",
            vertical: "false"
        };
        element = buildElement(attrs);
        scope.value = 100;
        scope.low = 0;
        scope.high = 1000;
        $compile(element)(scope);

        scope.$apply();
        scope = angular.element(element).scope();
        scope.$apply();
    }));

    it('should have the correct values on the scope', function() {
        expect(scope.value).toEqualNumber(100);
        expect(scope.low).toEqualNumber(0);
        expect(scope.high).toEqualNumber(1000);
    });

    it('should have DOM attributes set correctly', function() {
        expect(element.attr('vertical')).toBe("false");
        expect(element.attr('low')).toEqual("0");
    });

    it('should properly reflect value in progressbar sizing', function() {
        var getWidthPercent = function () {
            var bar = $(element).find(".ui-progressbar-value");
            return bar.css("width").replace("%", "");
        }

        // Wait a moment before checking these values: we need to let the
        // progress bar animate to its initial state first.
        waitsFor(function () {
            // Wait for the the width to be roughly what we want.
            return Math.abs(getWidthPercent() - 10) < 0.1;
        }, "progress bar to reach initial width", 1000);

        // We need to use Jasmine run blocks here because after updating
        // scope.value, the progress bar needs to animate to its new value, and
        // we need to wait until that is done to check the new value;
        runs(function () {
            expect(getWidthPercent()).toBeCloseTo(10, 0.1);
        });

        runs(function () {
            scope.$apply(function () {
                scope.value = 500;
            });
        });

        // Animation duration should be 300ms
        waitsFor(function () {
            // Wait for the width to be roughly what we want.
            return Math.abs(getWidthPercent() - 50) < 0.1;
        }, "progress bar to reach new width", 1000);
        runs(function () {
            expect(getWidthPercent()).toBeCloseTo(50, 0.1);
        });
    });
});

// Test vertical progress bars
describe('Directive: progressBar (vertical)', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element;

    // Add a matcher to compare strings and numbers for equality
    // (because Jasmine apparently doesn't do that)
    beforeEach(function () {
        var toEqualNumber = function (expected) {
            var actual = this.actual;
            this.message = function () {
                return "Expected " + actual + " to be equal to the number " + expected;
            }

            if (typeof actual === "string" || typeof actual === "number") {
                // Cast to number
                actual = +actual;
            } else {
                // Do nothing with 'actual'
            }

            return actual === expected;
        };
        this.addMatchers({toEqualNumber: toEqualNumber});

        // Some preliminary tests of the toEqualNumber matcher.
        var obj = {actual: 0};
        var rv = toEqualNumber.apply(obj, [0]);
        expect(rv).toBe(true);
        expect(obj.message).toBeDefined();
        expect(obj.message()).toBe("Expected 0 to be equal to the number 0");
        // For code coverage: test else-branch in toEqualNumber
        obj.actual = {};
        expect(toEqualNumber.apply(obj, [0])).toBe(false);
        expect(obj.message()).toBe("Expected [object Object] to be equal to the number 0");
    });

    var buildElement = function (attrs) {
        var el = angular.element('<div progress-bar ng-model="value"></div>');
        for (var key in attrs) {
            el.attr(key, attrs[key]);
        }
        return el;
    }

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        var attrs = {
            low: "{{low}}",
            high: "{{high}}",
            value: "value",
            vertical: "true"
        };
        element = buildElement(attrs);
        scope.value = 100;
        scope.low = 0;
        scope.high = 1000;
        $compile(element)(scope);

        scope.$apply();
        scope = angular.element(element).scope();
        scope.$apply();
    }));

    it('should have the correct values on the scope', function() {
        expect(scope.value).toEqualNumber(100);
        expect(scope.low).toEqualNumber(0);
        expect(scope.high).toEqualNumber(1000);
    });

    it('should have DOM attributes set correctly', function() {
        expect(element.attr('vertical')).toBe("true");
        expect(element.attr('low')).toEqual("0");
    });

    it('should properly reflect value in progressbar sizing', function() {
        var getHeightPercent = function () {
            var bar = $(element).find(".ui-progressbar-value");
            return bar.css("height").replace("%", "");
        }

        // Wait a moment before checking these values: we need to let the
        // progress bar animate to its initial state first.
        waitsFor(function () {
            // Wait for the the height to be roughly what we want.
            return Math.abs(getHeightPercent() - 10) < 0.1;
        }, "progress bar to reach initial height", 1000);

        // We need to use Jasmine run blocks here because after updating
        // scope.value, the progress bar needs to animate to its new value, and
        // we need to wait until that is done to check the new value;
        runs(function () {
            expect(getHeightPercent()).toBeCloseTo(10, 0.1);
        });

        runs(function () {
            scope.$apply(function () {
                scope.value = 500;
            });
        });

        // Animation duration should be 300ms
        waitsFor(function () {
            // Wait for the height to be roughly what we want.
            return Math.abs(getHeightPercent() - 50) < 0.1;
        }, "progress bar to reach new height", 1000);
        runs(function () {
            expect(getHeightPercent()).toBeCloseTo(50, 0.1);
        });
    });
});
