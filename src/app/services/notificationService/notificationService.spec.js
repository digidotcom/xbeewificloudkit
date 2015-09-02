/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

describe("Service: notificationService", function () {
    beforeEach(module("XBeeWiFiApp"));

    var toastr, service;

    beforeEach(inject(function (notificationService) {
        // notificationService just pulls toastr from the global scope, so
        // we'll assign our own definition to window.toastr to spy on what is
        // called
        toastr = window.toastr = {
            success: jasmine.createSpy("toastr.success-spy"),
            info: jasmine.createSpy("toastr.info-spy"),
            warning: jasmine.createSpy("toastr.warning-spy"),
            error: jasmine.createSpy("toastr.error-spy"),
            clear: jasmine.createSpy("toastr.clear-spy")
        };
        service = notificationService;
    }));

    it('should call toastr.clear on cancel', function () {
        service.cancel("value");
        expect(toastr.clear).toHaveBeenCalledWith("value");
        _.forEach(_.omit(toastr, ["clear"]), function (spy) {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should call toastr.success on success', function () {
        service.success("text", "title", {});
        expect(toastr.success).toHaveBeenCalledWith("text", "title", {});
        _.forEach(_.omit(toastr, ["success"]), function (spy) {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should call toastr.info on info', function () {
        service.info("text", "title", {});
        expect(toastr.info).toHaveBeenCalledWith("text", "title", {});
        _.forEach(_.omit(toastr, ["info"]), function (spy) {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should call toastr.warning on warning', function () {
        service.warning("text", "title", {});
        expect(toastr.warning).toHaveBeenCalledWith("text", "title", {});
        _.forEach(_.omit(toastr, ["warning"]), function (spy) {
            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should call toastr.error on error', function () {
        service.error("text", "title", {});
        expect(toastr.error).toHaveBeenCalledWith("text", "title", {});
        _.forEach(_.omit(toastr, ["error"]), function (spy) {
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
