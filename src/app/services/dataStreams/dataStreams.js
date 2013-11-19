/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('dataStreams', function dataStreams($log, $rootScope, socket,
                                                 cloudKitApi, notificationService) {
        // AngularJS will instantiate a singleton by calling "new" on this function
        var tree = new ListenerTree($rootScope, $log);

        socket.addListener('device_data', function (event) {
            $log.debug("Got new data: ", event);
            new_data_handler(event);
        });

        var disconnected = false;
        var disconnectedToast;
        socket.on('connect', function () {
            notificationService.success("Data will appear within the app soon!",
                                        "WebSocket connected", {timeout: 7000});
            // Init the DeviceCore monitor
            socket.emit("startmonitoringstatus");

            // Send socket messages to monitor devices in tree.
            // (Necessary if socket connection goes away and then comes back)
            if (disconnected) {
                _.each(tree.get_devices(), function (deviceid) {
                    $log.info("(Reconnected) Sending message to start monitoring ", deviceid);
                    socket.emit("startmonitoringdevice", deviceid);
                });
            }
            // Clear toast notification.
            if (disconnectedToast) {
                notificationService.cancel(disconnectedToast);
                disconnectedToast = null;
            }
            disconnected = false;
        });
        socket.on('disconnect', function () {
            if (disconnected) {
                // No need to show disconnected notification twice.
                return;
            }
            disconnected = true;
            disconnectedToast = notificationService.error(
                "Widgets will not update until the WebSocket reconnects or " +
                "the page is refreshed.", "WebSocket disconnected",
                {timeOut: 0, extendedTimeOut: 0, closeButton: true});
        });
        socket.on('started_monitoring', function (device_id) {
            $log.debug("Server socket response: started monitoring device: ", device_id);
        });
        socket.on('error', function (msg, extra) {
            $log.error("Error (via socket): ", msg, extra);
        });

        // regex used to parse streamId property in data pushes.
        // matches (Device ID)/(stream name)
        var streamRegex = /^([0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8})\/(.*)$/i;

        var new_data_handler = function (obj) {
            var point = obj.DataPoint || {};
            if (_.isEmpty(point)) {
                $log.info("Got bad device data object.", obj);
                return;
            }

            var value = point.data;
            var streamId = point.streamId || "__no_device__/NOSTREAM";
            var pieces = streamId.match(streamRegex);
            if (_.isEmpty(pieces)) {
                $log.info("Got bad device data object.", obj);
                return;
            }
            var device = pieces[1];
            var stream = pieces[2];

            var timestamp = point.timestamp || new Date().getTime();

            // Ensure that the timestamp is a number or a string. Any other
            // data types will be rejected.
            if (typeof timestamp === "string") {
                var parsed = _.parseInt(timestamp);
                if (_.isNaN(parsed)) {
                    // Unable to parse timestamp as number.
                    try {
                        var ts = JSON.stringify(timestamp);
                    } catch (e) {
                        // timestamp could be a recursive object...
                        $log.error("Parsing timestamp...", e);
                    }
                    $log.info("Got timestamp '" + timestamp + "', " +
                              "couldn't parse as number!");
                    return;
                } else {
                    // We were able to turn the timestamp into a number.
                    timestamp = parsed;
                }
            }
            else if (typeof timestamp !== "number") {
                // Timestamp is not a number or string. Reject this datapoint!
                $log.error("Got new data, with timestamp of type " + typeof timestamp);
                var stringified;
                try {
                    stringified = JSON.stringify(timestamp);
                } catch (e) {
                    stringified = "<unable to JSON-represent timestamp>";
                }
                $log.error("Timestamp received: " + stringified);
                // Ignore this data point's arrival altogether.
                return;
            }

            var new_data = {
                timestamp: timestamp,
                value: value
            };
            tree.trigger(device, stream, new_data);
        };

        // Populate widgets with initial data after they've registered listeners
        var initial_data_map = {};
        var get_initial_data = function(device, stream) {
            // If this is the first time data has been requested for this device, query it
            if (initial_data_map[device] === undefined) {
                initial_data_map[device] = cloudKitApi.device_data(device);
            }
            initial_data_map[device].then(function(data){
                var streamId = device + "/" + stream;
                var datastream = _.find(data, {'streamId': streamId});
                if(datastream){
                    $log.debug("Loading initial data for " + streamId , datastream);
                    //Data returned from /datastream is formatted a bit differently than monitor events
                    new_data_handler({
                        DataPoint: {
                            streamId: streamId,
                            data: datastream.currentValue.data,
                            timestamp: datastream.currentValue.timestamp
                        }
                    });
                }
            });
        }

        return {
            get_listening_streams: function () {
                var results = [];
                _.forOwn(tree.tree, function (branch, device_id) {
                    _.forOwn(branch, function (leaf, stream) {
                        if (leaf.listeners.length > 0) {
                            results.push(device_id + "/" + stream);
                        }
                    })
                });

                return results;
            },
            get_listener_tree: function () {
                return tree;
            },
            /*
             * function (device, stream, listener)
             * Add a listener callback (taking (newValue, oldValue)) for
             * the given data stream name.
             * Returns a function which, when called, removes the listener
             * from the listeners for that data stream (e.g. deregisters it)
             */
            listen: function (device, stream, listener) {
                // Only emit "startmonitoringdevice" event the first time we
                // listen for a stream on this device.
                if (!_.contains(tree.get_devices(), device)) {
                    $log.debug("CALLING STARTMONITORINGDEVICE", device);
                    socket.emit("startmonitoringdevice", device);
                } else {
                    $log.debug("Not calling startmonitoringdevice", device);
                }
                return tree.on(device, stream, listener);
            },
            new_data: new_data_handler,
            get_initial_data: get_initial_data
        };
    });

