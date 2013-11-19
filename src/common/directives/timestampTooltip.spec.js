/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Directive: timestampTooltip", function () {
    beforeEach(module("XBeeWiFiApp"));

    var scope, element;
    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope.$new();
        element = angular.element('<div timestamp-tooltip="time"></div>');
        // undefined time makes the tooltip start out saying widget has
        // received no data yet
        scope.time = undefined;
        $compile(element)(scope);
        scope.$apply();
    }));

    it("should have added certain attributes to the element", function () {
        expect(element.attr('tooltip')).toBe("_title");
        expect(element.attr('tooltip-placement')).toBe("bottom");
        expect(element.attr('data-toggle', 'tooltip'));
    });

    it("should have the correct starting tooltip text", function () {
        var expected = "Widget has not received data.";
        expect(scope._title).toBe(expected);
        // Bootstrap's tooltip.js appears to set data-original-title when the
        // tooltip text is updated, not title
        expect($(element).data('original-title')).toBe(expected);
    });

    it("should update the tooltip (title) when timestamp changes", function () {
        scope.time = 1000;
        var expected = "As of " + new Date(1000).toLocaleString();
        scope.$digest();
        expect(scope._title).toBe(expected);
        // Bootstrap's tooltip.js appears to set data-original-title when the
        // tooltip text is updated, not title
        expect($(element).data('original-title')).toBe(expected);
    });

    it("should update the tooltip appropriately when timestamp cannot be parsed", function () {
        // Code coverage completeness, and sanity check
        scope.time = "AAA";
        var expected = "As of timestamp AAA";
        scope.$digest();
        expect(scope._title).toBe(expected);
        // Bootstrap's tooltip.js appears to set data-original-title when the
        // tooltip text is updated, not title
        expect($(element).data('original-title')).toBe(expected);
    });
});
