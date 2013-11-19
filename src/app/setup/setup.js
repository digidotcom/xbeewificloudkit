/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

angular.module('XBeeWiFiApp.setup', [
    'XBeeWiFiApp.api',
    'XBeeWiFiApp.devices',
    'ui.router',
    'ui.route',
    'templates-app',
    'ui.bootstrap'
])
.controller('setupPageCtrl', function ($scope, $log, cloudKitApi, $modal, utils, dashboardService, $state, notificationService, $timeout) {
    utils.setTitle("Dashboard Creation");

    // TODO: Detect if user has any devices and dashboards in their account.
    // If no devices, show device selection page. (and Add Device)
    // If no dashboards, show device selection page (to pick dashboard).
    // ...

    // Values used in form
    $scope.selected_device = null;
    $scope.config_confirmed = false;
    $scope.dashboard_layout = "default"


    $scope.devices = null;

    $scope.get_devices = function () {
        $scope.selected_device = null;

        $scope.loading = true;
        cloudKitApi.devices().then(function (devices) {
            $scope.devices = devices;
            $scope.loading = false;

            if(devices.length === 1){
                $scope.selected_device = $scope.devices[0];
            }

        }, function (error) {
            $scope.load_error = error;
            $scope.loading = false;
        });
    }
    $scope.get_devices();


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
                $scope.loading = true;
                $timeout(function(){
                    $scope.get_devices();
                }, 3000);
                //TODO autoselect added device
            }
        });
    };

    // When the device selection changes, check the config
    $scope.$watch('selected_device', function(newDevice) {
        if(newDevice){
            // Make _config status holder for device
            newDevice._config = {};
            $scope.checkConfig(newDevice);
        }
    });

    $scope.config = {
        error: false,
        error_text: null,
        confirmed: false
    }

    // TODO - This is very similar to Devices page code, combine
    $scope.checkConfig = function checkConfig (device) {
        $scope.config.confirmed = false;
        $scope.config.error = false;
        device._config.checking = true;
        cloudKitApi.device_config(device.devConnectwareId).then(function(config) {
            $log.debug(config);
            // Config call will return a delta between current and kit config
            // If it's an empty object, we're at stock
            if (_.isEmpty(config['config-kit-stock-values'])) {
                // No additional action needed by user, so confirm config
                device._config.stock = true;
                $scope.config.confirmed = true;
            } else {
                device._config.stock = false;
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
        $scope.config.confirmed = false;
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

    $scope.dashboard_layouts = dashboardService._dashboard_layouts();
    $scope.selected_layout = $scope.dashboard_layouts[0];
    $scope.dashboard_working = false;

    $scope.create_dashboard = function (device, dashboard) {
        $log.debug("Creating new dashboard for device:", device);
        $log.debug("Dashboard definition:", dashboard.definition);
        $scope.dashboard_working = true;
        dashboardService.make_dashboard(device.devConnectwareId, dashboard.definition).then(function () {
            $scope.dashboard_working = false;
            $state.go('dashboard');
        }, function (response) {
            $log.error("Error creating dashboard", response);
            notificationService.error("Error creating dashboard. Please try again.");
            $scope.dashboard_working = false;
        });
    }

});
