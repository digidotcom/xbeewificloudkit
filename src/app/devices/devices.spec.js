/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Controller: devicesPageCtrl", function () {
    beforeEach(module("XBeeWiFiApp"));

    var scope, utils, api, devices_deferred, user_deferred, q;

    var mockModal, mockTimeout;

    beforeEach(inject(function ($rootScope, $controller, _utils_, $injector) {
        scope = $rootScope.$new();
        utils = _utils_;
        spyOn(utils, 'setTitle');
        api = $injector.get("cloudKitApi");
        q = $injector.get("$q");
        devices_deferred = q.defer();
        user_deferred = q.defer();
        spyOn(api, 'devices').andReturn(devices_deferred.promise);
        spyOn(api, 'user').andReturn(user_deferred.promise);

        mockModal = jasmine.createSpyObj("$modal", ["open"]);
        mockModal._result = q.defer();
        mockModal.open.andReturn({
            result: mockModal._result.promise
        });
        mockTimeout = jasmine.createSpy("$timeout");
        $controller("devicesPageCtrl", {
            $scope: scope, $log: $injector.get("$log"),
            cloudKitApi: api, utils: utils,
            $modal: mockModal, $timeout: mockTimeout
        });
    }));

    it("should call utils.setTitle", function () {
        expect(utils.setTitle).toHaveBeenCalledWith("Device Configuration");
    });

    it("should call cloudKitApi.devices() on initialization somewhere", function () {
        expect(api.devices).toHaveBeenCalled();
    });

    it("should call cloudKitApi.user() on initialization", function () {
        // This controller calls cloudKitApi.user in order to fetch the user's
        // Device Cloud URL and use that as part of the "Manage Devices" link
        expect(api.user).toHaveBeenCalled();
    });

    it("should set the .devices state appropriately around load_devices()", function () {
        expect(scope.devices.loaded).toBe(false);
        expect(scope.devices.loading).toBe(true);
    });

    it("should set the .devices state appropriately on api.devices() success", function () {
        devices_deferred.resolve(["a", "b", "c"]);
        scope.$digest();

        expect(scope.devices.loaded).toBe(true);
        expect(scope.devices.loading).toBe(false);
        expect(scope.devices.list).toEqual(["a", "b", "c"]);
    });

    it("should set the .devices state appropriately on api.devices() success", function () {
        devices_deferred.reject({status: 400});
        scope.$digest();

        expect(scope.devices.loaded).toBe(true);
        expect(scope.devices.loading).toBe(false);
        expect(scope.devices.list).toEqual([]);
        expect(scope.devices.load_error.length).toBeGreaterThan(0);
    });

    it("should have correct things on scope", function () {
        expect(scope.add_device).toEqual(jasmine.any(Function));
        expect(scope.load_devices).toEqual(jasmine.any(Function));
        expect(scope.checkConfig).toEqual(jasmine.any(Function));
        expect(scope.configure_device).toEqual(jasmine.any(Function));
        expect(scope.devices).toEqual(jasmine.any(Object));
        expect(scope.config).toEqual({error: false, error_text: null});
        // Default Device Cloud URL is the US cloud
        expect(scope.cloud_fqdn).toEqual("login.etherios.com");
    });

    it("should open a modal on add_device", function () {
        scope.add_device();
        expect(mockModal.open).toHaveBeenCalled();
    });

    it("should load devices after a delay when modal .result resolves", function () {
        // scope.load_devices() is called on controller instantiation, and it
        // sets loading=true. We need to reset that
        scope.devices.loading = false;
        scope.add_device();
        mockModal._result.resolve(true);
        scope.$digest();

        expect(scope.devices.loading).toBe(true);
        expect(mockTimeout).toHaveBeenCalledWith(jasmine.any(Function), 3000);

        spyOn(scope, 'load_devices');

        // Call the function passed into $timeout
        (mockTimeout.mostRecentCall.args[0])();

        expect(scope.load_devices).toHaveBeenCalled();
    });

    it("should not load devices, etc. if modal.result resolves but no device was added", function () {
        // scope.load_devices() is called on controller instantiation, and it
        // sets loading=true. We need to reset that
        scope.devices.loading = false;
        scope.add_device();
        mockModal._result.resolve(false);
        scope.$digest();

        expect(scope.devices.loading).toBe(false);
        expect(mockTimeout).not.toHaveBeenCalled();
    });

    it("should not load devices, etc. if modal.result rejects", function () {
        // scope.load_devices() is called on controller instantiation, and it
        // sets loading=true. We need to reset that
        scope.devices.loading = false;
        scope.add_device();
        mockModal._result.reject();
        scope.$digest();

        expect(scope.devices.loading).toBe(false);
        expect(mockTimeout).not.toHaveBeenCalled();
    });

    it("should update scope.cloud_fqdn when cloudKitApi.user returns", function () {
        user_deferred.resolve({cloud_fqdn: "test_fqdn"});
        scope.$digest();

        expect(scope.cloud_fqdn).toEqual("test_fqdn");
    });

    // Code coverage: cloudKitApi.user() call hits an error
    it("should not update cloud_fqdn if cloudKitApi.user is rejected", function () {
        user_deferred.reject({});
        scope.$digest();

        expect(scope.cloud_fqdn).toBe("login.etherios.com");
    });

    // configure_device tests
    it("should set ._config.applying to true on the device", function () {
        var deferred = q.defer();
        spyOn(api, 'device_config_apply_stock').andReturn(deferred.promise);

        var device_obj = {
            _config: {
                applying: false,
                error: false,
                error_text: ""
            }
        };

        scope.configure_device(device_obj);
        scope.$digest();

        expect(device_obj._config.applying).toBe(true);
    });

    it("should call through to scope.checkConfig when config is applied", function () {
        var deferred = q.defer();
        var deferred_check = q.defer();
        spyOn(api, 'device_config_apply_stock').andReturn(deferred.promise);
        spyOn(api, 'device_config').andReturn(deferred_check.promise);
        spyOn(scope, "checkConfig").andCallThrough();

        var device_obj = {
            devConnectwareId: "0000",
            _config: {
                applying: false,
                checking: false,
                error: false,
                error_text: ""
            }
        };

        scope.configure_device(device_obj);
        expect(api.device_config_apply_stock).toHaveBeenCalledWith(device_obj.devConnectwareId);
        deferred.resolve();
        scope.$digest();

        expect(device_obj._config.applying).toBe(false);

        // Into the logic of scope.checkConfig
        expect(scope.checkConfig).toHaveBeenCalledWith(device_obj);
        expect(scope.config.error).toBe(false);
        expect(device_obj._config.checking).toBe(true);
        expect(api.device_config).toHaveBeenCalledWith(device_obj.devConnectwareId);
    });

    it("should take note of configuration errors if there are any", function () {
        var deferred = q.defer();
        spyOn(api, 'device_config_apply_stock').andReturn(deferred.promise);

        var device_obj = {
            devConnectwareId: "0000",
            _config: {
                applying: false,
                checking: false,
                error: false,
                error_text: ""
            }
        };

        scope.configure_device(device_obj);
        expect(api.device_config_apply_stock).toHaveBeenCalledWith(device_obj.devConnectwareId);

        // First, let's reject the promise, but there are no errors to
        // record... (code coverage case)
        deferred.reject({});
        scope.$digest();

        expect(device_obj._config.applying).toBe(false);
        expect(scope.config.error).toBe(true);
        expect(scope.config.error_text).toBe(null);

        // Now, let's reject the promise, with an error message inside.
        deferred = q.defer();
        api.device_config_apply_stock.andReturn(deferred.promise);
        scope.configure_device(device_obj);
        expect(api.device_config_apply_stock).toHaveBeenCalledWith(device_obj.devConnectwareId);

        deferred.reject({something: {error: {desc: "AAA"}}});
        scope.$digest();

        expect(device_obj._config.applying).toBe(false);
        expect(scope.config.error).toBe(true);
        expect(scope.config.error_text).toBe("AAA");
    });

    // More in-depth checkConfig tests
    it("should set device._config state appropriate when config is checked", function () {
        var deferred = q.defer();
        spyOn(api, 'device_config').andReturn(deferred.promise);

        var device_obj = {
            devConnectwareId: "0000",
            _config: {
                applying: false,
                checking: false,
                error: false,
                error_text: ""
            }
        };

        scope.checkConfig(device_obj);
        expect(api.device_config).toHaveBeenCalledWith(device_obj.devConnectwareId);

        deferred.resolve({'config-kit-stock-values': []});
        scope.$digest();

        expect(device_obj._config.checked).toBe(true);
        expect(device_obj._config.stock).toBe(true);
        expect(device_obj._config.checking).toBe(false);
    });

    it("should set device._config state appropriate when config is checked (non-stock)", function () {
        var deferred = q.defer();
        spyOn(api, 'device_config').andReturn(deferred.promise);

        var device_obj = {
            devConnectwareId: "0000",
            _config: {
                applying: false,
                checking: false,
                error: false,
                error_text: ""
            }
        };

        scope.checkConfig(device_obj);
        expect(api.device_config).toHaveBeenCalledWith(device_obj.devConnectwareId);

        // Make there be a non-empty difference with stock value
        deferred.resolve({'config-kit-stock-values': ["A", "B"]});
        scope.$digest();

        expect(device_obj._config.checked).toBe(true);
        expect(device_obj._config.stock).toBe(false);
        expect(device_obj._config.checking).toBe(false);
    });

    it("should take note of any errors while checking config", function () {
        var deferred = q.defer();
        spyOn(api, 'device_config').andReturn(deferred.promise);

        expect(scope.config.error).toBe(false);
        expect(scope.config.error_text).toBe(null);

        var device_obj = {
            devConnectwareId: "0000",
            _config: {
                applying: false,
                checking: false,
                error: false,
                error_text: ""
            }
        };

        scope.checkConfig(device_obj);
        expect(api.device_config).toHaveBeenCalledWith(device_obj.devConnectwareId);

        // Reject the device_config promise
        deferred.reject({});
        scope.$digest();

        expect(scope.config.error).toBe(true);
        expect(device_obj._config.checking).toBe(false);
        // No error message to extract from response
        expect(scope.config.error_text).toBe(null);


        // Do it again, but have the reject response include an error message
        scope.config.error = false;
        scope.config.error_text = null;
        deferred = q.defer();
        api.device_config.andReturn(deferred.promise);
        scope.checkConfig(device_obj);
        expect(api.device_config).toHaveBeenCalledWith(device_obj.devConnectwareId);

        deferred.reject({something: {error: {desc: "ABC"}}});
        scope.$digest();

        expect(scope.config.error).toBe(true);
        expect(device_obj._config.checking).toBe(false);
        expect(scope.config.error_text).toBe("ABC");
    });
});

describe("Controller: devicesAddModalCtrl", function () {
    beforeEach(module("XBeeWiFiApp"));

    var scope, modalInstance, api, provision_deferred, device_config_apply_deferred;

    beforeEach(inject(function ($rootScope, $controller, cloudKitApi, $injector) {
        scope = $rootScope.$new();
        api = cloudKitApi;
        modalInstance = jasmine.createSpyObj("$modalInstance", ['close', 'dismiss']);
        var q = $injector.get("$q");
        provision_deferred = q.defer();
        device_config_apply_deferred = q.defer();
        spyOn(api, 'provision_device_mac').andReturn(provision_deferred.promise);
        spyOn(api, 'device_config_apply').andReturn(device_config_apply_deferred.promise);
        $controller("devicesAddModalCtrl", {
            $scope: scope, $log: $injector.get("$log"),
            cloudKitApi: api, $modalInstance: modalInstance
        });
    }));

    it("should have a state object inside", function () {
        expect(scope.state).toBeDefined();
        expect(scope.state.working).toBe(false);
        expect(scope.state.error).toBe(false);
        expect(scope.state.error_text).toBe(null);
    });

    it("should call $modalInstance.dismiss on cancel()", function () {
        scope.cancel();
        expect(modalInstance.dismiss).toHaveBeenCalledWith('cancel');
    });

    it("should set state.working to true on first add() call", function () {
        scope.add("fake mac", "fake desc");
        expect(scope.state.working).toBe(true);
    });

    it("should behave correctly when provisioning resolves (success, no description)", function () {
        expect(scope.state.working).toBe(false);
        scope.add("fake mac");
        expect(api.provision_device_mac).toHaveBeenCalledWith("fake mac");
        expect(scope.state.working).toBe(true);
        provision_deferred.resolve();
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        // No description passed in, so expect the modal to be closed
        // immediately
        expect(modalInstance.close).toHaveBeenCalledWith(true);
    });

    it("should behave correctly when provisioning resolves (success, description success)", function () {
        expect(scope.state.working).toBe(false);
        scope.add("001122334455", "description");
        expect(api.provision_device_mac).toHaveBeenCalledWith("001122334455");
        expect(scope.state.working).toBe(true);
        provision_deferred.resolve();
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        expect(scope.state.error).toBe(false);
        expect(scope.state.error_text).toBe(null);
        // A description was passed in, so expect to go out to apply device
        // configuration
        expect(api.device_config_apply).toHaveBeenCalledWith(
            "00000000-00000000-001122FF-FF334455", "system", {description: "description"}
        );
        expect(modalInstance.close).not.toHaveBeenCalled(); // yet

        device_config_apply_deferred.resolve();
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        expect(scope.state.error).toBe(false);
        expect(scope.state.error_text).toBe(null);
        expect(modalInstance.close).toHaveBeenCalledWith(true);
    });

    it("should behave correctly when provisioning resolves (success, description failure)", function () {
        expect(scope.state.working).toBe(false);
        scope.add("001122334455", "description");
        expect(api.provision_device_mac).toHaveBeenCalledWith("001122334455");
        expect(scope.state.working).toBe(true);
        provision_deferred.resolve();
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        expect(scope.state.error).toBe(false);
        expect(scope.state.error_text).toBe(null);
        // A description was passed in, so expect to go out to apply device
        // configuration
        expect(api.device_config_apply).toHaveBeenCalledWith(
            "00000000-00000000-001122FF-FF334455", "system", {description: "description"}
        );
        expect(modalInstance.close).not.toHaveBeenCalled(); // yet

        device_config_apply_deferred.reject();
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        expect(scope.state.error).toBe(false);
        expect(scope.state.error_text).toBe(null);
        expect(modalInstance.close).toHaveBeenCalledWith(true);
    });

    it("should behave correctly when provisioning resolves (failure)", function () {
        expect(scope.state.working).toBe(false);
        scope.add("fake mac");
        expect(api.provision_device_mac).toHaveBeenCalledWith("fake mac");
        expect(scope.state.working).toBe(true);
        provision_deferred.reject({data: "Failure."});
        // Trigger callbacks
        scope.$digest();

        expect(scope.state.working).toBe(false);
        expect(scope.state.error_text).toEqual("Failure.");
        expect(scope.state.error).toBe(true);
        expect(modalInstance.close).not.toHaveBeenCalled();
        expect(modalInstance.dismiss).not.toHaveBeenCalled();
    });

    it("should ignore add() calls while add() is working", function () {
        expect(scope.state.working).toBe(false);
        scope.add("test");
        expect(scope.state.working).toBe(true);
        expect(api.provision_device_mac).toHaveBeenCalledWith("test");

        // Reset the provision_device_mac spy
        expect(scope.state.working).toBe(true);
        api.provision_device_mac.reset();
        scope.add("test2");
        expect(scope.state.working).toBe(true);
        expect(api.provision_device_mac).not.toHaveBeenCalled();
    });
});
