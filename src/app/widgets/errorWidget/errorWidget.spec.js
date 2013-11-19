/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: errorWidget', function() {
    beforeEach(module('XBeeWiFiApp'));

    var scope, element;

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        element = angular.element('<div error-widget="widget" />');
        scope.widget = {id: 1, type: "error", options: {}};
        $compile(element)(scope);
    }));

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("error");
    });
});
