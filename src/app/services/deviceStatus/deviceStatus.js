/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('deviceStatus', function deviceStatus($log, $rootScope, socket, cloudKitApi) {
        var device_status_map = {}

        socket.addListener('device_status', function (msg) {
            $log.debug("Got new data: ", msg);
            new_data_handler(msg);
        });

        var new_data_handler = function (obj) {
            var devCore = obj.DeviceCore || {};

            if (_.isEmpty(devCore)) {
                $log.info("Got bad device status object.", obj);
                return;
            }

            var status = devCore.dpConnectionStatus;
            var devId = devCore.devConnectwareId;

            device_status_map[devId] = status;
        };

        // Initialize device state when service first loaded
        cloudKitApi.devices().then(function (resp) {
            _.each(resp, function(device) {
                device_status_map[device.devConnectwareId] = device.dpConnectionStatus;
            });
        }, function (resp) {
            $log.error("Error loading initial device connectivity status", resp);
        });

        return {
            device_status_map: device_status_map
        };
    });
