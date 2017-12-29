/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

angular.module('XBeeWiFiApp.devices', [
    'XBeeWiFiApp.api',
    'ui.router',
    'ui.route',
    'templates-app',
    'ui.bootstrap'
])
.controller('devicesPageCtrl', function ($scope, $log, cloudKitApi, $modal, utils, $timeout) {
    utils.setTitle("Device Configuration");

    $scope.add_device = function () {
        var modalInstance = $modal.open({
            templateUrl: 'devices/devices-add-modal.tpl.html',
            controller: 'devicesAddModalCtrl',
            backdrop: 'static'
        });

        modalInstance.result.then(function (device_added) {
            if(device_added){
                //If device was added, refresh device list
                // Device cloud can take a bit between returning from provision call to when
                // device is ready, so build in a bit of delay
                $scope.devices.loading = true;
                $timeout(function(){
                    $scope.load_devices();
                }, 3000);
            }
        });
    };

    $scope.devices = {
        loaded: false,
        loading: false,
        load_error: null,
        selected: null,
        list: []
    };

    $scope.load_devices = function () {
        $scope.devices.loaded = false;
        $scope.devices.loading = true;
        $scope.devices.load_error = "";
        $scope.devices.selected = null;
        $scope.devices.list.splice(0, $scope.devices.list.length);

        cloudKitApi.devices().then(function (devices) {
            $scope.devices.loaded = true;
            $scope.devices.loading = false;
            $scope.devices.list.splice.apply($scope.devices.list,
                                        [0, 0].concat(devices));
        }, function (response) {
            $scope.devices.loaded = true;
            $scope.devices.loading = false;
            $scope.devices.load_error = "An error was encountered while " +
                                        "loading the device list. Please " +
                                        "try again. (Status: " +
                                        response.status + ")";
        });
    }

    $scope.config = {
        error: false,
        error_text: null
    }

    // TODO - This is very similar to setup page code, combine
    $scope.checkConfig = function checkConfig (device) {
        $scope.config.error = false;
        device._config.checking = true;
        cloudKitApi.device_config(device.devConnectwareId).then(function(config) {
            $log.debug(config);
            // Config call will return a delta between current and kit config
            // If it's an empty object, we're at stock
            if (_.isEmpty(config['config-kit-stock-values'])) {
                // No additional action needed by user, so confirm config
                device._config.stock = true;
                device._config.checked = true;
            } else {
                device._config.stock = false;
                device._config.checked = true;
            }
            device._config.checking = false;
        }, function (response) {
            $log.error("Error retreiving device config: " + response);
            $scope.config.error = true;

            var errors = utils.find_key(response, 'error');
            if(errors.length){
                //Display first error found in response
                $scope.config.error_text = errors[0].error.desc;
            }
            device._config.checking = false;
        });
    }

    $scope.configure_device = function (device) {
        device._config.applying = true;
        cloudKitApi.device_config_apply_stock(device.devConnectwareId).then(function () {
            device._config.applying = false;
            $scope.checkConfig(device);
        }, function (response) {
            $log.error("Error applying device config: " + response);
            device._config.applying = false;
            $scope.config.error = true;

            var errors = utils.find_key(response, 'error');
            if(errors.length){
                //Display first error found in response
                $scope.config.error_text = errors[0].error.desc;
            }
        });
    }

    $scope.load_devices();

    $scope.cloud_fqdn = "devicecloud.digi.com";
    cloudKitApi.user().then(function (user) {
        $scope.cloud_fqdn = user.cloud_fqdn;
    }, function (resp) {
        $log.error("Failed to load user info on devices page", resp);
    });
})
.controller('devicesAddModalCtrl', function($scope, $modalInstance, cloudKitApi, $log) {
    $scope.state = {
        working: false,
        error: false,
        error_text: null
    }

    $scope.add = function (device_mac, device_desc) {
        if ($scope.state.working) {
            // IE8 has a tendency to trigger the add() call twice on click.
            // We need to ensure we only send the request once.
            $log.debug("Skipping duplicate Add Device clicks.");
            return;
        }
        $scope.state.working = true;

        cloudKitApi.provision_device_mac(device_mac).then(function(){
            $log.debug("Succesfully added " + device_mac);
            $scope.state.working = false;
            if(device_desc){
                // Try to send the description to the device
                // TODO ideally we should use id fetched from newly added device, but for now shortcut it
                var deviceId = "00000000-00000000-" + device_mac.substring(0,6) + "FF-FF" +  device_mac.substring(6);
                cloudKitApi.device_config_apply(deviceId, 'system', {description: device_desc}).then(function(){
                    $modalInstance.close(true);
                }, function(response){
                    //TODO What to do in case of error? Currently fails silently
                    $log.error("Error while applying description to new device: ", response);
                    $modalInstance.close(true);
                })
            } else {
                $modalInstance.close(true);
            }
        }, function (response) {
            $log.error("Error provisioning mac " + device_mac, response);
            // TODO clean up error extraction, right now we get some ugly xml string
            $scope.state.error_text = response.data;
            $scope.state.error = true;
            $scope.state.working = false;
        });
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});
