/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: serialWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element;

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        element = angular.element('<div serial-widget="widget" />');
        scope.widget = {id: 1, type: "serial", options: {}};
        $compile(element)(scope);
    }));

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("serial");
    });
});
