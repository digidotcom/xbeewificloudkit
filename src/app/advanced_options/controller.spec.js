/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

describe("Controller: advancedOptionsCtrl", function () {
    beforeEach(module("XBeeWiFiApp"));

    var scope, ctrl, backend, dashboardService, utils, q, state;
    var url_q;

    beforeEach(inject(function ($rootScope, $controller, $injector) {
        dashboardService = $injector.get("dashboardService");
        utils = $injector.get("utils");
        q = $injector.get("$q");
        url_q = q.defer();

        backend = $injector.get("$httpBackend");
        state = {go: jasmine.createSpy('state.go')};

        spyOn(utils, 'setTitle');
        spyOn(dashboardService, 'current_url').andReturn(url_q.promise);

        scope = $rootScope.$new();

        ctrl = $controller("advancedOptionsCtrl", {
            $scope: scope, dashboardService: dashboardService,
            $state: state, utils: utils
        });
    }));

    afterEach(function () {
        backend.verifyNoOutstandingRequest();
        backend.verifyNoOutstandingExpectation();
    });

    it("should set the page title", function () {
        expect(utils.setTitle).toHaveBeenCalledWith("Advanced Options");
    });

    it("should set up the state properly", function () {
        expect(scope.current_dash).toBe(null);
        expect(scope.error).toBe(null);
        expect(scope.deleting_dash).toBeFalsy();

        // fetch_current() called immediately
        expect(scope.getting_url).toBeTruthy();
    });

    it("should ask for the current dashboard URL immediately", function () {
        expect(dashboardService.current_url).toHaveBeenCalled();
    });

    describe("(when the current URL is fetched successfully)", function () {
        beforeEach(function () {
            url_q.resolve("abcd");
            // digest once to trigger .then, a second time to trigger .finally
            scope.$digest();
            scope.$digest();
        });

        it("should set current_dash", function () {
            expect(scope.current_dash).toBe("abcd");
        });

        it("should set error to null", function () {
            expect(scope.error).toBe(null);
        });

        it("should not be getting the URL anymore", function () {
            expect(scope.getting_url).toBeFalsy();
        });
    });

    describe("(when there are no dashboards in the account)", function () {
        beforeEach(function () {
            url_q.reject("No dashboards in your account.");
            // digest once to trigger .then, a second time to trigger .finally
            scope.$digest();
            scope.$digest();
        });

        it("should set 'current_dash' to null", function () {
            expect(scope.current_dash).toBe(null);
        });

        it("should not be getting the URL anymore", function () {
            expect(scope.getting_url).toBeFalsy();
        });

        it("should not set scope.error", function () {
            // null current_url -> no dashboard
            expect(scope.error).toBe(null);
        });
    });

    describe("(when there is an error loading the dashboard)", function () {
        beforeEach(function () {
            url_q.reject("Fatal error occurred.");
            scope.current_dash = 12345;
            // digest once to trigger .then, a second time to trigger .finally
            scope.$digest();
            scope.$digest();
        });

        it("should leave current_dash alone", function () {
            expect(scope.current_dash).toBe(12345);
        });

        it("should not be getting the URL anymore", function () {
            expect(scope.getting_url).toBeFalsy();
        });

        it("should set scope.error to the response text", function () {
            expect(scope.error).toBe("Fatal error occurred.");
        });
    });

    describe("when deleting the dashboard", function () {
        // Only test it at the surface
        it("should set deleting_dash to true and call the HTTP API", function () {
            scope.current_dash = "/api/dashboards/1";

            backend.expectDELETE(scope.current_dash).respond(200);

            scope.delete_it();

            expect(scope.deleting_dash).toBeTruthy();

            backend.flush();
            backend.resetExpectations();
        });

        describe("succeeds,", function () {
            beforeEach(function () {
                scope.current_dash = "foo";

                backend.expectDELETE(scope.current_dash).respond(200);

                scope.delete_it();
                backend.flush();
            });

            it("should push the user to dashboard setup", function () {
                expect(state.go).toHaveBeenCalledWith('setup');
            });

            it("should set deleting_dash to false", function () {
                expect(scope.deleting_dash).toBeFalsy();
            });
        });

        describe("fails,", function () {
            beforeEach(function () {
                scope.current_dash = "foo";

                backend.expectDELETE(scope.current_dash).respond(400, "xyz");

                scope.delete_it();
                backend.flush();
            });

            it("should set the error to the response data", function () {
                expect(scope.error).toBe("xyz");
            });

            it("should not have changed the UI route", function () {
                expect(state.go).not.toHaveBeenCalled();
            });

            it("should set deleting_dash to false", function () {
                expect(scope.deleting_dash).toBeFalsy();
            });
        });
    });
});
