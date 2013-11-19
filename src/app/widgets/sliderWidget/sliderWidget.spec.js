/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: sliderWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element, sliderScope, httpBackend, injector;

    beforeEach(inject(function($rootScope, $compile, $httpBackend, $injector) {
        injector = $injector;
        var outerscope = $rootScope.$new();
        element = angular.element('<div slider-widget="widget" state="s" />');
        outerscope.widget = {id: 1, type: "slider", device: "aaa", pwm: "M0"};
        outerscope.s = 0;
        $compile(element)(outerscope);

        // We don't give any valid response to this GET, so that the values on
        // the scope don't change and trigger any additional callbacks.
        $httpBackend.expect("GET", "/api/devices/aaa/config/InputOutput?cache=true").
            respond(200);
        $httpBackend.flush();
        outerscope.$apply();
        scope = outerscope.$$childHead;
        sliderScope = scope.$$childHead;
        httpBackend = $httpBackend;
    }));

    afterEach(function () {
        httpBackend.verifyNoOutstandingRequest();
        httpBackend.verifyNoOutstandingExpectation();
        expect(scope.state).toBe(0);
    });

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("slider");
        expect(scope.widget.device).toBe("aaa");
        expect(scope.widget.pwm).toBe("M0");
    });

    it('should start with the correct scope values', function () {
        expect(scope.value).toBe(undefined);
        expect(scope.display_value).toBe(undefined);
    });

    it('should have its child scope being the slider', function () {
        expect(sliderScope).toBeDefined();
        expect(sliderScope.$slider).toBeDefined();
        expect(sliderScope.in_value).toBe(undefined);
        expect(sliderScope.out_value).toBe(undefined);
    });

    it('should have to correct default values on the widget', function () {
        var widget = scope.widget;
        expect(widget.low).toBe(0);
        expect(widget.high).toBe(1023);
        expect(widget.step).toBe(1);
    });

    it('should have the correct scope bindings in the slider', function () {
        expect(sliderScope.min).toBe(0);
        expect(sliderScope.max).toBe(1023);
        expect(sliderScope.step).toBe(1);
    });

    it('should send the updated value one second after the value changes', function () {
        runs(function () {
            scope.$apply(function () {
                scope.value = 10;
            });
        });
        // wait long enough for the timeout to be over
        waits(1500);
        runs(function () {
            // Needed to trigger the timeout callback
            httpBackend.expectPUT("/api/devices/aaa/io", {M0: 10}).respond(200);
            scope.$apply();
            injector.get('$timeout').flush();
            expect(scope.state).toBe(1);
            httpBackend.flush();
            scope.$apply();
            expect(scope.state).toBe(0);
        });
    })
});
