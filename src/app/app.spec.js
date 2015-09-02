/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: NavbarController", function () {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var scope, ctrl, q, apiMock;

    beforeEach(inject(function ($rootScope, $controller, $q) {
        scope = $rootScope.$new();
        q = $q;
        apiMock = {
            user: function () {
                var deferred = q.defer();
                deferred.resolve({username: "Bob", cloud_fqdn: "FQDN"});
                return deferred.promise;
            }
        };
        spyOn(apiMock, 'user').andCallThrough();
        ctrl = $controller("NavbarController", {
            $scope: scope, cloudKitApi: apiMock
        });
    }));

    it("should start with appropriate starting values", function () {
        expect(scope.username).toBe("");
        expect(scope.cloud_fqdn).toBe("https://login.etherios.com");
    });

    it("should call cloudKitApi.user on initialization", function () {
        expect(apiMock.user).toHaveBeenCalledWith();
    });

    it("should update scope values when cloudKitApi.user returns", function () {
        expect(apiMock.user).toHaveBeenCalledWith();

        // Run the callback attached to the user() promise
        scope.$digest();

        expect(scope.username).toBe("Bob");
        expect(scope.cloud_fqdn).toBe("https://FQDN");
    });

    it("should appropriately handle cloudKitApi.user returning no object", inject(function ($controller, $rootScope) {
        var scope = $rootScope.$new();
        var deferred = q.defer();
        deferred.resolve(null);
        var apiMock = {
            user: jasmine.createSpy().andReturn(deferred.promise)
        };

        // Need to create controller again manually here, to test behavior.
        $controller("NavbarController", {
            $scope: scope, cloudKitApi: apiMock
        });

        expect(apiMock.user).toHaveBeenCalledWith();

        // Run the callback attached to the user() promise
        scope.$digest();

        expect(scope.username).toBe("<unknown>");
        // cloud_fqdn is not updated in the then() callback
        expect(scope.cloud_fqdn).toBe("https://login.etherios.com");
    }));
});

describe("Response handler: handle429", function () {
    var rootScope, httpBackend, q, timeout, nextTimeoutFn;

    beforeEach(module('XBeeWiFiApp'));

    // Rather than trying to use the built-in $timeout and its flushing
    // capabilities, just capture $timeout calls.
    timeout = jasmine.createSpy("timeout");
    nextTimeoutFn = function () {
        return timeout.mostRecentCall.args[0].apply(undefined, arguments);
    };

    beforeEach(module(function ($provide) {
        $provide.value('$timeout', timeout);
    }));

    beforeEach(inject(function ($q, $rootScope, $httpBackend) {
        q = $q;
        rootScope = $rootScope;
        httpBackend = $httpBackend;
    }));

    afterEach(function () {
        httpBackend.verifyNoOutstandingRequest();
        httpBackend.verifyNoOutstandingExpectation();
    });

    it("should be a function", inject(function (handle429) {
        expect(handle429).toEqual(jasmine.any(Function));
    }));

    it("should reject its promise if retries >= 5", inject(function (handle429) {
        var response = {config: {_retries: 5}};
        var promise = handle429(response);
        var failCb = jasmine.createSpy("rejection");
        promise.then(undefined, failCb);

        // Execute deferred callbacks
        rootScope.$digest();

        expect(failCb).toHaveBeenCalledWith(response);
        expect(timeout).not.toHaveBeenCalled();
    }));

    it("should reject its promise if the retry errors out", inject(function (handle429) {
        httpBackend.whenGET('/fakeurl').respond(400, {}, '');
        var response = {config: {method: 'GET', url: '/fakeurl'}, status: 429};
        var promise = handle429(response);
        var callbacks = jasmine.createSpyObj("callbacks", ["success", "failure"]);
        promise.then(callbacks.success, callbacks.failure);

        expect(timeout).toHaveBeenCalledWith(jasmine.any(Function), 1000);
        // Pretend the timeout has elapsed
        nextTimeoutFn();
        httpBackend.expectGET('/fakeurl');
        httpBackend.flush();

        expect(callbacks.success).not.toHaveBeenCalled();
        expect(callbacks.failure).toHaveBeenCalled();
    }));

    it("should delay a retry for 1000*_retries otherwise", inject(function (handle429) {
        httpBackend.whenGET('/fakeurl').respond(200, {}, '');
        var response = {config: {method: 'GET', url: '/fakeurl'}, status: 429};
        var promise = handle429(response);
        var callbacks = jasmine.createSpyObj("callbacks", ["success", "failure"]);
        promise.then(callbacks.success, callbacks.failure);

        expect(timeout).toHaveBeenCalledWith(jasmine.any(Function), 1000);
        // Pretend the timeout has elapsed
        nextTimeoutFn();
        httpBackend.expectGET('/fakeurl');
        httpBackend.flush();

        expect(callbacks.success).toHaveBeenCalled();
        expect(callbacks.failure).not.toHaveBeenCalled();

        // Reset
        callbacks.success.reset();
        httpBackend.resetExpectations();
        timeout.reset();

        // Loop over all possible retry-count values (0..4) where we try again
        for (var count = 0; count <= 4; count++) {
            response = {config: {method: 'GET', url: '/fakeurl', _retries: count}, status: 429};
            promise = handle429(response);
            promise.then(callbacks.success, callbacks.failure);
            httpBackend.whenGET('/fakeurl').respond(429, {_retries: count+1}, '');

            expect(timeout).toHaveBeenCalledWith(jasmine.any(Function), (count+1) * 1000);
            timeout.reset();
        }
    }));
});

describe("Response interceptor: errorInterceptor", function () {
    var rootScope, httpBackend, q, handle429;

    beforeEach(module('XBeeWiFiApp'));

    handle429 = jasmine.createSpy("handle429");

    beforeEach(module(function ($provide) {
        $provide.value('handle429', handle429);
    }));

    beforeEach(inject(function ($q, $rootScope, $httpBackend) {
        q = $q;
        rootScope = $rootScope;
        rootScope.$state = jasmine.createSpyObj("$state", ["go"]);
        httpBackend = $httpBackend;
    }));

    afterEach(function () {
        httpBackend.verifyNoOutstandingRequest();
        httpBackend.verifyNoOutstandingExpectation();
    });

    it("should be a valid response interceptor", inject(function (errorInterceptor) {
        expect(errorInterceptor).toBeDefined();
        expect(errorInterceptor).toEqual(jasmine.any(Function));

        var deferred = q.defer();
        var promise = deferred.promise;
        spyOn(promise, 'then');
        errorInterceptor(promise);

        expect(promise.then).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
    }));

    it("should have a success callback that just returns the response", inject(function (errorInterceptor) {
        var deferred = q.defer();
        var promise = deferred.promise;
        spyOn(promise, 'then');
        errorInterceptor(promise);

        // Error interceptor will call promise.then(success, error)
        var successFn = promise.then.mostRecentCall.args[0];

        expect(successFn("AAA")).toBe("AAA");
        expect(successFn("BBB")).toBe("BBB");
    }));

    it("should navigate to login page on 403 error", inject(function (errorInterceptor) {
        var deferred = q.defer();
        var promise = deferred.promise;
        spyOn(promise, 'then');
        errorInterceptor(promise);

        // Error interceptor will call promise.then(success, error)
        var errorFn = promise.then.mostRecentCall.args[1];

        errorFn({status: 403});
        expect(rootScope.$state.go).toHaveBeenCalledWith("login");
    }));

    it("should handle 429 (throttling) by calling handle429", inject(function (errorInterceptor) {
        var deferred = q.defer();
        var promise = deferred.promise;

        // We want to capture the 'error' function inside errorInterceptor
        spyOn(promise, 'then').andCallThrough();
        errorInterceptor(promise);

        var errfn = promise.then.mostRecentCall.args[1];

        errfn({status: 429, config: {method: 'GET', url: '/fakepath'}});
        rootScope.$digest();

        // errorInterceptor should call handle429
        expect(handle429).toHaveBeenCalled();
    }));
});
