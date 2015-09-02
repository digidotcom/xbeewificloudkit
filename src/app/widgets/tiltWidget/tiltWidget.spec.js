/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Directive: tiltWidget', function() {
    var dataStreams, unlisten_map = {}, listener_map = {};

    var deviceId = "00000000-00000000-00001000-00002000";

    beforeEach(module('XBeeWiFiApp', function ($provide) {
        // http://stackoverflow.com/a/15865818
        $provide.decorator('dataStreams', function ($delegate) {
            var _dataStreams = $delegate;
            spyOn(_dataStreams, 'listen').andCallFake(function (device, stream, listener) {
                var fn = jasmine.createSpy("unlistener - " + stream);
                unlisten_map[stream] = fn;

                // Add a spy on the listener to dataStreams' listenerTree, so
                // sending updates will actually trigger the listener but also
                // be spied on.
                var fn2 = jasmine.createSpy("spy on listener - " + stream).andCallFake(listener);
                var tree = _dataStreams.get_listener_tree();
                tree.on(device, stream, fn2);
                listener_map[stream] = fn2;

                return fn;
            });
            spyOn(_dataStreams, 'get_initial_data');

            return _dataStreams;
        });
    }));

    var scope, element;

    beforeEach(inject(function ($httpBackend, _dataStreams_) {
        $httpBackend.whenGET("/api/devices" + deviceId + "data").respond({items: []});
        $httpBackend.expectGET("/api/devices" + deviceId + "data");

        dataStreams = _dataStreams_;
    }));

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope.$new();
        element = angular.element('<div tilt-widget="widget" />');
        scope.widget = {device: deviceId, id: 1, type: "tilt", stream_x: "DIO0", stream_y: "DIO1"};
        $compile(element)(scope);
        // change 'scope' to point to widget's scope, and call $digest to
        // trigger compilation and linking
        scope = scope.$$childHead;
        scope.$digest();
    }));

    afterEach(function () {
        // We want the widget to automatically unregister its stream listeners
        // from dataStreams when it is being destroyed.
        scope.$broadcast('$destroy');

        expect(unlisten_map[scope.widget.stream_x]).toHaveBeenCalled();
        expect(unlisten_map[scope.widget.stream_y]).toHaveBeenCalled();
    });

    it('should have the correct widget in the scope', function() {
        expect(scope.widget).toBeDefined();
        expect(scope.widget.type).toBe("tilt");
    });

    it('should start with x and y set at 1250', function () {
        expect(scope.x).toBe(1250);
        expect(scope.y).toBe(1250);
    });

    it('should have called dataStreams.listen with X and Y streams', function () {
        // Extract these variables to ease future changes to the test.
        var device = scope.widget.device;
        var streamx = scope.widget.stream_x;
        var streamy = scope.widget.stream_y;

        expect(dataStreams.listen)
                .toHaveBeenCalledWith(device, streamx, jasmine.any(Function));
        expect(dataStreams.listen)
                .toHaveBeenCalledWith(device, streamy, jasmine.any(Function));

        expect(dataStreams.get_initial_data)
                .toHaveBeenCalledWith(device, streamx);
        expect(dataStreams.get_initial_data)
                .toHaveBeenCalledWith(device, streamy);
    });

    it("should call the appropriate listener on dataStreams updates", function () {
        // This test is added for code coverage and as a sanity check.
        var xstream = scope.widget.device + '/' + scope.widget.stream_x;
        var ystream = scope.widget.device + '/' + scope.widget.stream_y;

        var innerObj = {
            data: 0,
            timestamp: 1,
            streamId: xstream
        };
        // Construct the new_data object this way to simplify changing the
        // values passed.
        var newData = {
            DataPoint: innerObj
        };

        dataStreams.new_data(newData);
        expect(listener_map[scope.widget.stream_x])
                .toHaveBeenCalledWith({timestamp: 1, value: 0}, null,
                                      scope.widget.device, scope.widget.stream_x);
        expect(scope.x).toBe(0);

        innerObj.streamId = ystream;
        innerObj.data = 5;
        dataStreams.new_data(newData);
        expect(listener_map[scope.widget.stream_y])
                .toHaveBeenCalledWith({timestamp: 1, value: 5}, null,
                                      scope.widget.device, scope.widget.stream_y);
        expect(scope.y).toBe(5);
    });
});
