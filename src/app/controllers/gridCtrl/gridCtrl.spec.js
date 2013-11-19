/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: GridCtrl", function() {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var scope, ctrl;
    var deferred, q;
    var WidgetServiceMock = {
        widgets_uncached: function () {
            deferred = q.defer();
            return deferred.promise;
        }
    };

    beforeEach(inject(function ($rootScope, $controller, $q) {
        scope = $rootScope.$new();
        q = $q;
        spyOn(WidgetServiceMock, 'widgets_uncached').andCallThrough();
        ctrl = $controller('GridCtrl', {
            $scope: scope, dashboardService: WidgetServiceMock
        });
    }));

    it('should start with no widgets on the scope', function () {
        expect(scope.widgets).toEqual([]);
    });

    it('should call dashboardService.widgets_uncached on initialization', function() {
        expect(WidgetServiceMock.widgets_uncached).toHaveBeenCalled();
    });

    it('should update scope.widgets with widgets_uncached response', function () {
        try {
            expect(scope.widgets).toEqual([]);
            deferred.resolve([1, 2, 3, 4]);
            // To trigger Angular's lifecycle and do the deferred computation
            scope.$apply();
            // Check that scope.widgets is correct
            expect(scope.widgets).toEqual([1, 2, 3, 4]);
        } catch (e) {
            console.error(e);
        }
    });

    it('should not update scope.widgets if widgets_uncached fails', function () {
        expect(scope.widgets).toEqual([]);
        deferred.reject("Response goes here");
        // To trigger Angular's lifecycle and do the deferred computation
        scope.$apply();
        expect(scope.widgets).toEqual([]);
    });
});
