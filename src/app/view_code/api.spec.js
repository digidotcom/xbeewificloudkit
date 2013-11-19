/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: viewCodeApi", function () {
    // Load module
    beforeEach(module("XBeeWiFiApp.api"));

    var backend, api, rootScope;

    function defaultWhenGET() {
        backend.whenGET(/^\/static\/.*$/).respond(200, "Hello!");
    }

    beforeEach(inject(function ($injector) {
        api = $injector.get('viewCodeApi');
        backend = $injector.get('$httpBackend');
        rootScope = $injector.get('$rootScope');
    }));

    afterEach(function () {
        backend.verifyNoOutstandingRequest();
        backend.verifyNoOutstandingExpectation();
    });

    it("should correctly GET built-in widget files", function () {
        defaultWhenGET();
        var fileTypes = ["js", "css", "less", "tpl.html"];

        // Note: Yes, this format for the unit test works. You can test that it
        // does by adding .andCallFake(function (arg) { console.log(arg); })
        // after jasmine.createSpy(...) and observing that the spy gets called
        // once per file type. This way of writing the unit test is cleaner
        // than making a new it() per file type.
        _.forEach(fileTypes, function (type) {
            var promise = api.getCode("testWidget", type, true);
            var spy = jasmine.createSpy("-success-");
            promise.then(spy);
            var path = "src/app/widgets/testWidget/testWidget";
            backend.expectGET("/static/" + path + "." + type);
            rootScope.$apply();
            backend.flush();
            expect(spy).toHaveBeenCalledWith({
                source: "Hello!", path: path + "." + type
            });

            spy.reset();
        });
    });

    it("should correctly GET user-made widget files", function () {
        defaultWhenGET();
        var fileTypes = ["js", "css", "less", "tpl.html"];

        // Note: Yes, this format for the unit test works. You can test that it
        // does by adding .andCallFake(function (arg) { console.log(arg); })
        // after jasmine.createSpy(...) and observing that the spy gets called
        // once per file type. This way of writing the unit test is cleaner
        // than making a new it() per file type.
        _.forEach(fileTypes, function (type) {
            var promise = api.getCode("testWidget", type, false);
            var spy = jasmine.createSpy("-success-");
            promise.then(spy);
            var path = "src/common/widgets/testWidget/testWidget";
            backend.expectGET("/static/" + path + "." + type);
            rootScope.$apply();
            backend.flush();
            expect(spy).toHaveBeenCalledWith({
                source: "Hello!", path: path + "." + type
            });

            spy.reset();
        });
    });

    it('should correctly reject the getCode promise on bad file type', function () {
        var promise = api.getCode("testWidget", "blah");
        var spy1 = jasmine.createSpy("-success-");
        var spy2 = jasmine.createSpy("-failure-");
        promise.then(spy1, spy2);

        rootScope.$apply();

        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalledWith({
            message: "unsupported filetype for viewing code of testWidget"
        });
    });

    it('should correctly reject the getCode promise on HTTP error', function () {
        backend.whenGET(/^\/static\/.*$/).respond(404);
        var promise = api.getCode("testWidget", "css");
        var spy1 = jasmine.createSpy("-success-");
        var spy2 = jasmine.createSpy("-failure-");
        promise.then(spy1, spy2);

        rootScope.$apply();
        backend.flush();

        expect(spy1).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalledWith({status: 404});
    });
});
