/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: dataStreams", function() {
    var socket, socket_listeners = {};
    // Load module
    beforeEach(module("XBeeWiFiApp", function ($provide) {
        // http://stackoverflow.com/a/15865818
        $provide.decorator('socket', function ($delegate) {
            var sock = $delegate;
            spyOn(sock, 'addListener').andCallFake(function (event, cb) {
                socket_listeners[event] = cb;
            });
            spyOn(sock, 'on').andCallFake(function (event, cb) {
                socket_listeners[event] = cb;
            });
            spyOn(sock, 'emit');

            return $delegate;
        });
    }));

    var deviceId = "00000000-00000000-00409DFF-FF000000";

    var streams, tree, notifications, api, q, rootScope;
    var device_data_deferreds = {};
    beforeEach(inject(function ($q, dataStreams, _socket_, notificationService, cloudKitApi, $rootScope) {
        rootScope = $rootScope;
        q = $q;
        streams = dataStreams;
        tree = streams.get_listener_tree();
        socket = _socket_;

        notifications = notificationService;
        spyOn(notifications, 'success').andCallThrough();
        spyOn(notifications, 'error').andCallThrough();
        spyOn(notifications, 'cancel').andCallThrough();

        api = cloudKitApi;
        spyOn(api, 'device_data').andCallFake(function (device) {
            if (device in device_data_deferreds) {
                return device_data_deferreds[device];
            }
            else {
                var deferred = q.defer();
                device_data_deferreds[device] = deferred;
                return deferred.promise;
            }
        });
    }));

    it('should start with no stream data or listeners', function () {
        expect(tree.tree).toEqual({});
        expect(streams.get_listening_streams()).toEqual([]);
    });

    it("should call socket.addListener and socket.on appropriately, right away", function () {
        expect(socket.addListener).toHaveBeenCalledWith('device_data', jasmine.any(Function));
        expect(socket.on).toHaveBeenCalledWith('connect', jasmine.any(Function));
        expect(socket.on).toHaveBeenCalledWith('disconnect', jasmine.any(Function));
        expect(socket.on).toHaveBeenCalledWith('started_monitoring', jasmine.any(Function));
        expect(socket.on).toHaveBeenCalledWith('error', jasmine.any(Function));
    });

    it("should serve up a success notification on socket connect", function () {
        expect(socket_listeners.connect).toBeDefined();
        socket_listeners.connect();

        expect(notifications.success).toHaveBeenCalled();
        expect(socket.emit).toHaveBeenCalledWith("startmonitoringstatus");
    });

    it("should serve up an error notification on socket disconnect", function () {
        expect(socket_listeners.disconnect).toBeDefined();
        socket_listeners.disconnect();

        expect(notifications.error).toHaveBeenCalled();
    });

    it("should ignore duplicate disconnects before re-connecting", function () {
        expect(notifications.error).not.toHaveBeenCalled();
        socket_listeners.disconnect();
        expect(notifications.error).toHaveBeenCalled();

        notifications.error.reset();
        socket_listeners.disconnect();
        // Duplicate disconnect events should just be ignored
        expect(notifications.error).not.toHaveBeenCalled();
    });

    it("should emit startmonitoringdevice for each device on reconnect", function () {
        streams.listen("AAA", "DIO/0", function () {});
        streams.listen("AAB", "DIO/0", function () {});
        streams.listen("AAC", "DIO/0", function () {});
        socket_listeners.disconnect();
        socket_listeners.connect();

        expect(socket.emit).toHaveBeenCalledWith("startmonitoringdevice", "AAA");
        expect(socket.emit).toHaveBeenCalledWith("startmonitoringdevice", "AAB");
        expect(socket.emit).toHaveBeenCalledWith("startmonitoringdevice", "AAC");
    });

    it("should call cloudKitApi.device_data on get_initial_data", function () {
        expect(api.device_data).not.toHaveBeenCalled();
        streams.get_initial_data("my device", "aaa");
        expect(api.device_data).toHaveBeenCalledWith("my device");
    });

    describe("should bring up a notification when an error is received", function () {
        beforeEach(function () {
            // No notifications initially.
            expect(notifications.success).not.toHaveBeenCalled();
            expect(notifications.error).not.toHaveBeenCalled();
            expect(notifications.cancel).not.toHaveBeenCalled();
        });

        it("and handle empty messages correctly", function () {
            var msg = "An error occurred";
            socket_listeners.error(msg);
            expect(notifications.error).toHaveBeenCalledWith(
                undefined, msg, {timeOut: 10000});
            notifications.error.reset();

            socket_listeners.error(msg, "");
            expect(notifications.error).toHaveBeenCalledWith(
                undefined, msg, {timeOut: 10000});
        });

        it("and handle plain-text errors correctly", function () {
            var msg = "An error occurred",
                extra = "This is the error message.";
            socket_listeners.error(msg, extra);
            expect(notifications.error).toHaveBeenCalledWith(
                extra, msg, {timeOut: 10000});
        });

        it("and parse basic RCI errors", function () {
            var msg = "An error occurred",
                extra = "<rci_reply><error>ABC</error></rci_reply>";

            socket_listeners.error(msg, extra);
            expect(notifications.error).toHaveBeenCalledWith(
                "ABC", msg, {timeOut: 10000});
        });

        it("and parse RCI error non-greedily", function () {
            // It should only extract the first error tag
            var msg = "An error occurred",
                extra = "<error>First error</error><error>Another error</error>";

            socket_listeners.error(msg, extra);
            expect(notifications.error).toHaveBeenCalledWith(
                "First error", msg, {timeOut: 10000});
            expect(notifications.error).not.toHaveBeenCalledWith(
                "Another error", msg, {timeOut: 10000});
        });

        it("and trims web service crud from the error message", function () {
            // "PUT Monitor error. Invalid request." should be removed. Same
            // goes for "POST Monitor error. ..."
            var msg = "An error occurred",
                extra = "<error>PUT Monitor error. Invalid request. Foo.</error>";

            socket_listeners.error(msg, extra);
            expect(notifications.error).toHaveBeenCalledWith(
                "Foo.", msg, {timeOut: 10000});
        });
    });

    it("(CODE COVERAGE CASE)", function () {
        socket_listeners.started_monitoring();
        socket_listeners.device_data({});

        streams.get_initial_data("device", "a");
        // covers 'else' branch of get_initial_data if statement
        streams.get_initial_data("device", "b");
        // executes get_initial_data cloudKitApi.device_data callback

        // Only have one of the streams...
        device_data_deferreds.device.resolve([
            {
                streamId: "device/a",
                currentValue: {
                    data: 0, timestamp: 5
                }
            }
        ]);
        rootScope.$digest();

        socket_listeners.disconnect();
        socket_listeners.connect();
    });

    it("(CODE COVERAGE CASE -- JSON.stringify in new_data_handler when timestamp is string)", function () {
        // In order to make the JSON.stringify call throw an exception, we'll
        // need to spy on it and make it throw an Exception.
        // But we won't "spy" on it, we'll just replace it with null! That way,
        // you can't call JSON.stringify(timestamp)
        var old_stringify = JSON.stringify;
        JSON.stringify = null;

        spyOn(tree, 'trigger');

        // The attempted JSON.stringify call will throw an exception, that will
        // be caught and logged, and we'll never call through to tree.trigger
        streams.new_data({DataPoint: {streamId: deviceId + "/DIO/0", timestamp: "a"}});
        expect(tree.trigger).not.toHaveBeenCalled();

        JSON.stringify = old_stringify;
    });

    it('should correctly register a new listener', function () {
        // We never call the listener, so for the purposes of unit testing
        // (and code coverage) it doesn't matter that cb is not a function.
        var cb = {};

        streams.listen(deviceId, "TEST", cb);

        expect(streams.get_listening_streams()).toContain(deviceId + "/TEST");
        expect(tree.tree[deviceId].TEST).toBeDefined();
        expect(tree.tree[deviceId].TEST.listeners).toContain(cb);
    });

    it('should correctly deregister a listener when called', function () {
        // We never call the listener, so for the purposes of unit testing
        // (and code coverage) it doesn't matter that cb is not a function.
        var cb = {};

        var deregister = streams.listen(deviceId, "TEST", cb);

        deregister();

        expect(streams.get_listening_streams()).toEqual([]);
    });

    it('should call the correct listener on new data', function () {
        var spy = jasmine.createSpy("data listener");
        var spy2 = jasmine.createSpy("data listener 2");

        streams.listen(deviceId, "TEST", spy);
        streams.listen(deviceId, "TEST2", spy2);

        var obj = {
            DataPoint: {
                streamId: deviceId + "/TEST",
                data: 5,
                timestamp: 1
            }
        };
        streams.new_data(obj);
        expect(spy).toHaveBeenCalledWith({timestamp: 1, value: 5}, null, deviceId, "TEST");
        expect(spy2).not.toHaveBeenCalled();

        obj.DataPoint.data = 10;
        streams.new_data(obj);
        expect(spy).toHaveBeenCalledWith({timestamp: 1, value: 10},
                                         {timestamp: 1, value: 5},
                                         deviceId, "TEST");
        expect(spy2).not.toHaveBeenCalled();

        // clears the call-tracking state of the spy
        spy.reset();
        obj.DataPoint.streamId = deviceId + "/TEST2";
        streams.new_data(obj);
        expect(spy).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalledWith({timestamp: 1, value: 10}, null, deviceId, "TEST2");
    });

    it("should parse timestamp strings in .new_data", function () {
        spyOn(tree, 'trigger');

        var stream = deviceId + '/DIO/0';
        streams.new_data({DataPoint: {streamId: stream, data: 0, timestamp: "100"}});
        expect(tree.trigger).toHaveBeenCalledWith(deviceId, "DIO/0", {timestamp: 100, value: 0});

        // timestamp is string, but not a number
        tree.trigger.reset();
        streams.new_data({DataPoint: {streamId: stream, data: 0, timestamp: "_"}});
        expect(tree.trigger).not.toHaveBeenCalled();

        // timestamp isn't a string or number
        tree.trigger.reset();
        var recursive_obj = {};
        recursive_obj.a = recursive_obj;
        streams.new_data({DataPoint: {streamId: stream, data: 1, timestamp: recursive_obj}});
        expect(tree.trigger).not.toHaveBeenCalled();
    });

    it("should properly handle malformed data in .new_data", function () {
        // new_data doesn't throw any Errors, so we just have to spy on
        // tree.trigger and check that it doesn't get called
        spyOn(tree, 'trigger');
        expect(tree.trigger).not.toHaveBeenCalled();

        // Empty object
        streams.new_data({});
        expect(tree.trigger).not.toHaveBeenCalled();

        // No streamId
        streams.new_data({DataPoint: {data: 0}});
        expect(tree.trigger).not.toHaveBeenCalled();

        // Invalid streamId
        streams.new_data({DataPoint: {data: 0, streamId: "aaa/1"}});
        expect(tree.trigger).not.toHaveBeenCalled();

        // Finally, some valid data
        streams.new_data({DataPoint: {data: 0, timestamp: 5, streamId: deviceId + "/DIO/1"}});
        expect(tree.trigger).toHaveBeenCalledWith(deviceId, "DIO/1", {timestamp: 5, value: 0});

        // Valid data, but it's missing a timestamp. This is for code coverage
        // over line 84
        streams.new_data({DataPoint: {data: 0, streamId: deviceId + "/DIO/1"}});
        expect(tree.trigger).toHaveBeenCalledWith(deviceId, "DIO/1",
                                                  {timestamp: jasmine.any(Number), value: 0});
    });

    it("should emit startmonitoringdevice on newly-listened device", function () {
        expect(tree.get_devices()).not.toContain("AAA");
        streams.listen("AAA", "DIO/0", undefined);

        expect(tree.get_devices()).toContain("AAA");
        expect(socket.emit).toHaveBeenCalledWith("startmonitoringdevice", "AAA");
    });
});


