/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: socket", function () {
    var io, socket, service, timeout;

    beforeEach(module("XBeeWiFiApp"));

    beforeEach(function () {
        socket = {
            on: jasmine.createSpy("on"),
            emit: jasmine.createSpy("emit"),
            removeListener: jasmine.createSpy("removeListener"),
            disconnect: jasmine.createSpy("disconnect")
        };
        io = window.io = {
            connect: jasmine.createSpy().andReturn(socket)
        }
    });

    beforeEach(inject(function (_socket_, $timeout) {
        service = _socket_;
        timeout = $timeout;
    }));

    it("should call io.connect('/device', ...) right away", function () {
        expect(io.connect).toHaveBeenCalledWith('/device', {transports: ['xhr-polling']});
    });

    it("should call socket.on('connect') right away", function () {
        expect(socket.on).toHaveBeenCalledWith('connect', jasmine.any(Function));
        // for code coverage completeness
        (socket.on.mostRecentCall.args[1])();
    });

    it("should call socket.on on .on or .addListener", function () {
        socket.on.reset();
        service.on("blah", null);
        // socket service wraps callbacks in an AngularJS timeout
        expect(socket.on).toHaveBeenCalledWith("blah", jasmine.any(Function));
        socket.on.reset();

        service.addListener("blah2", null);
        expect(socket.on).toHaveBeenCalledWith("blah2", jasmine.any(Function));
    });

    it("should call socket.emit on .emit", function () {
        socket.emit.reset();
        service.emit("event", "my data");
        expect(socket.emit).toHaveBeenCalledWith("event", "my data");

        service.emit("event2", "my other data");
        expect(socket.emit).toHaveBeenCalledWith("event2", "my other data");
    });

    it("should call socket.removeListener on .removeListener", function () {
        // The service's removeListener method should call
        // socket.removeListener with the same arguments
        service.removeListener("x", "y");
        expect(socket.removeListener).toHaveBeenCalledWith("x", "y");
    });

    it("should call socket.emit with a wrapped callback on .emit", function () {
        var spy = jasmine.createSpy("emit callback");
        service.emit("event 3", "more data", spy);
        expect(socket.emit).toHaveBeenCalledWith("event 3", "more data", jasmine.any(Function));
        var wrappedCb = socket.emit.mostRecentCall.args[2];
        wrappedCb(1, 2, 3);
        // the wrapped callback should do a $timeout of 0 ms, so if we flush
        // $timeout, we should see the spy being called with the arguments of
        // wrappedCb's call
        timeout.flush();
        expect(spy).toHaveBeenCalledWith(1, 2, 3);
    });

    it("should call socket.disconnect() in window.onbeforeunload", function () {
        expect(window.onbeforeunload).toBeDefined();
        expect(window.onbeforeunload).toEqual(jasmine.any(Function));

        expect(socket.disconnect).not.toHaveBeenCalled();
        window.onbeforeunload();
        expect(socket.disconnect).toHaveBeenCalled();
    });
});
