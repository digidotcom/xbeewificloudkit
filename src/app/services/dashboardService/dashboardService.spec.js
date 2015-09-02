/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: dashboardService", function() {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var dashboard = {
        url: "fake-url/api/dashboards/1",
        widgets: [
            {id: "widget1", type: "buzzer", label: "B1", options: {}},
            {id: "widget2", type: "switch", label: "S1", options: {}}
        ]
    };
    var cloned_widgets = _.cloneDeep(dashboard.widgets);

    var ready = function(backend) {
        backend.when('GET', '/api/dashboards').respond([dashboard]);
        backend.when('POST', '/api/dashboards').respond(200);
    }

    var after = function (backend) {
        backend.verifyNoOutstandingRequest();
        backend.verifyNoOutstandingExpectation();
    }

    var service, rootScope, apply, api, q;

    beforeEach(inject(function (dashboardService, $rootScope, cloudKitApi, $q) {
        service = dashboardService;
        rootScope = $rootScope;
        apply = function (fn) {
            rootScope.$apply(fn);
        }
        // Make the cloudKitApi service available for mocking, i.e. so we don't
        // have to do everything at the $httpBackend level if we don't want to
        api = cloudKitApi;
        q = $q;
    }));

    /*
     *it("should start without any widgets", function () {
     *    expect(service.widgets.length).toBe(0);
     *});
     */

    it("should do a GET to /api/dashboards when updated", inject(function($httpBackend) {
        ready($httpBackend);
        var ignored = service.widgets();
        $httpBackend.expect("GET", '/api/dashboards');
        apply();
        $httpBackend.flush();
        expect(ignored).toBeDefined();
        after($httpBackend);
    }));

    it("should get the widgets correctly", inject(function($httpBackend) {
        ready($httpBackend);
        var call = service.widgets();
        // Adapted from:
        // https://github.com/mgonto/restangular/issues/98#issuecomment-19091163
        var received;
        call.then(function (val) {
            received = val;
        });
        apply();
        $httpBackend.flush();
        expect(received.length).toBe(dashboard.widgets.length);
        after($httpBackend);
    }));

    it("should reject the widgets() promise appropriately on empty API data", inject(function ($httpBackend) {
        // Mostly exists for code coverage
        $httpBackend.when("GET", "/api/dashboards").respond([]);
        var promise = service.widgets();
        var good = false, bad = false;
        var resp = null;
        promise.then(function () { good = true; resp = arguments; },
                  function () { bad = true; resp = arguments; });
        apply();
        $httpBackend.flush();

        expect(bad).toBe(true);
        // Expect the promise to be rejected with [<message>, <cloudKitApi response>]
        expect(resp[0]).toEqual(["No dashboards in your account.", jasmine.any(Object)]);
    }));

    it("should reject the widgets() promise appropriately on API error code", inject(function ($httpBackend) {
        // Mostly exists for code coverage
        $httpBackend.when("GET", "/api/dashboards").respond(400, [], {});
        var promise = service.widgets();
        var good = false, bad = false;
        var resp = null;
        promise.then(function () { good = true; resp = arguments; },
                  function () { bad = true; resp = arguments; });
        apply();
        $httpBackend.flush();

        expect(bad).toBe(true);
        // Expect the promise to be rejected with [<message>, <cloudKitApi response>]
        expect(resp[0]).toEqual(["Fetching dashboard failed", jasmine.any(Object)]);
    }));

    it("should reject the widgets() promise appropriately on empty API data - fetching again", inject(function ($httpBackend) {
        // Mostly exists for code coverage
        $httpBackend.when("GET", "/api/dashboards").respond([]);
        // "Fetch" the dashboard once to start, so that 'fetched' is true
        service.widgets();

        var promise = service.widgets();
        var good = false, bad = false;
        var resp = null;
        promise.then(function () { good = true; resp = arguments; },
                  function () { bad = true; resp = arguments; });
        apply();
        $httpBackend.flush();

        expect(bad).toBe(true);
        // Expect the promise to be rejected with [<message>, <cloudKitApi response>]
        expect(resp[0]).toEqual(["No dashboards in your account.", jasmine.any(Object)]);
    }));

    it("should reject the widgets() promise appropriately on API error code - fetching again", inject(function ($httpBackend) {
        // Mostly exists for code coverage
        $httpBackend.when("GET", "/api/dashboards").respond(400, [], {});
        // "Fetch" the dashboard once to start, so that 'fetched' is true
        service.widgets();

        var promise = service.widgets();
        var good = false, bad = false;
        var resp = null;
        promise.then(function () { good = true; resp = arguments; },
                  function () { bad = true; resp = arguments; });
        apply();
        $httpBackend.flush();

        expect(bad).toBe(true);
        // Expect the promise to be rejected with [<message>]
        // (This is inconsistent with the non-pre-fetched handler...)
        expect(resp[0]).toEqual(["Fetching dashboard failed"]);
    }));

    it("should POST an empty list of widgets on make_empty_dashboard", inject(function ($httpBackend) {
        ready($httpBackend);

        service.make_dashboard("", []);
        $httpBackend.expect("POST", "/api/dashboards", {"widgets": []});

        apply();
        $httpBackend.flush();
        after($httpBackend);
    }));

    it("should POST the stock dashboard on make_stock_dashboard", inject(function ($httpBackend) {
        ready($httpBackend);

        var deviceId = "DEVICE ID";

        var widgets = service._dashboard_layouts()[0].definition;

        service.make_dashboard(deviceId, widgets);

        _.each(widgets, function (widget) {
            widget.device = deviceId;
        });
        $httpBackend.expect("POST", "/api/dashboards", {widgets: widgets});

        apply();
        $httpBackend.flush();
        after($httpBackend);
    }));

    it("should call through to cloudKitApi on update_widgets", function () {
        var dash_dfd = q.defer();
        dash_dfd.resolve(dashboard);
        spyOn(api, "dashboard").andReturn(dash_dfd.promise);

        var resolver = jasmine.createSpy("resolver");
        var rejecter = jasmine.createSpy("rejecter");
        var promise = service.widgets();
        promise.then(resolver, rejecter);
        expect(api.dashboard).toHaveBeenCalled();

        var deferred = q.defer();
        spyOn(api, "update_widgets").andReturn(deferred.promise);
        // Trigger deferred callbacks
        apply();
        // Go one level deeper, to trigger the api.dashboard callbacks
        apply();

        expect(resolver).toHaveBeenCalledWith(dashboard.widgets);
        expect(rejecter).not.toHaveBeenCalled();

        // Reset the spies, so we can re-use them in an update_widgets call.
        resolver.reset();
        rejecter.reset();

        //*********************************
        // Test update_widgets logic

        service.update_widgets().then(resolver, rejecter);
        // Trigger deferred callbacks on update_widgets
        apply();

        expect(api.update_widgets).toHaveBeenCalledWith(
            _.last(dashboard.url.split(/com|org|net/)),
            cloned_widgets
        );
        deferred.resolve();
        // Trigger deferred callbacks within the api.update_widgets call
        apply();

        expect(resolver).toHaveBeenCalled();
        expect(rejecter).not.toHaveBeenCalled();


        // Repeat what's just above, except reject the update_widgets promise.
        resolver.reset();
        rejecter.reset();
        deferred = q.defer();
        api.update_widgets.andReturn(deferred.promise);

        service.update_widgets().then(resolver, rejecter);
        // Trigger deferred callbacks on update_widgets
        apply();

        expect(api.update_widgets).toHaveBeenCalledWith(
            _.last(dashboard.url.split(/com|org|net/)),
            cloned_widgets
        );
        deferred.reject();
        // Trigger deferred callbacks within the api.update_widgets call
        apply();

        expect(resolver).not.toHaveBeenCalled();
        expect(rejecter).toHaveBeenCalled();
    });

    // Sanity check
    it("should call through to widgets() on widgets_uncached()", function () {
        var api_deferred = q.defer();
        // widgets_uncached should set up a new deferred object, for dashboard_dfd
        spyOn(q, 'defer').andCallThrough();

        // Unfortunately, we can't spy directly on the widgets function. We
        // can, however, spy on cloudKitApi.dashboard (which will be called in
        // get_dashboard, which is called in widgets), and do stuff there.
        spyOn(api, "dashboard");
        spyOn(api_deferred.promise, "then");
        api.dashboard.andReturn(api_deferred.promise);

        service.widgets_uncached();

        expect(q.defer).toHaveBeenCalled();
        expect(api_deferred.promise.then).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
    });

    // TODO: Write test cases for remove_widget
});
