/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Directive: tiltIndicator", function () {
    beforeEach(module("XBeeWiFiApp"));

    var element, scope;
    var circleMock = jasmine.createSpyObj("circleMock", ["attr", "animate"]);
    circleMock.attr.andReturn(circleMock);

    beforeEach(function () {
        var mockRaphael = jasmine.createSpyObj("Raphael", ["image", "circle"]);
        mockRaphael.image.andReturn({attr: function () {}});
        mockRaphael.circle.andReturn(circleMock);

        window.Raphael = function () { return mockRaphael; };
    });

    beforeEach(inject(function ($rootScope, $compile) {
        var outerscope = $rootScope.$new();
        element = angular.element('<div tilt-indicator x="x" y="y" xcenter="1250" ycenter="1250" xrange="1250" yrange="1250"></div>');
        outerscope.x = 1250;
        outerscope.y = 1250;
        $compile(element)(outerscope);

        scope = outerscope.$$childHead;
        scope.$digest();
    }));

    it("should have the right data binding on scope", function () {
        expect(scope.x).toBe(1250);
        expect(scope.y).toBe(1250);
        expect(scope.xcenter).toBe(1250);
        expect(scope.ycenter).toBe(1250);
        expect(scope.xrange).toBe(1250);
        expect(scope.yrange).toBe(1250);
    });

    it("should move the 'ball' correctly when x and y change", function () {
        scope.x = 1200;
        scope.$digest();
        expect(circleMock.animate).toHaveBeenCalled();
        circleMock.animate.reset();

        // Set Raphael.type to VML for code coverage
        window.Raphael.type = "VML";
        scope.y = 1200;
        scope.$digest();
        expect(circleMock.animate).toHaveBeenCalled();
        circleMock.animate.reset();
    });
});
