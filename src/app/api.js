/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

angular.module( 'XBeeWiFiApp.api', [
    'restangular'
])
.config( function myAppConfig ( RestangularProvider ) {
    RestangularProvider.setBaseUrl("/api");
    RestangularProvider.setDefaultHttpFields({withCredentials:true});
    RestangularProvider.setResponseExtractor(function (res, op, what) {
        var response = res;
        switch (what) {
            case "dashboards":
                // Handle extreme cases.
                if (!res) {
                    res = [];
                }
                if (res.length === 0) {
                    // No dashboards in the account. Return an empty dashboard
                    // with url=null, to signify that there is no dashboard to
                    // be found.
                    response = {url: null, widgets: []};
                } else {
                    // Get the correct dashboard, by selecting the dashboard
                    // with the lowest number.
                    var oldest_dash = _.min(res, function (dash) {
                        return _.last(dash.url.split('/'))
                    });
                    response = oldest_dash;
                }

                // Sanitize widgets
                _.each(response.widgets, function (widget) {
                    _.forOwn(widget, function (val, key) {
                        if (key.charAt(0) === '$') {
                            delete widget[key];
                        }
                    });
                });
                break;
            case "user":
                if (!res) {
                    res = [];
                }
                response = (res.length === 0 ? null : res[0]);
                break;
            case "devices":
                if (!res) {
                    res = {items: []};
                }
                response = res.items;
                break;
            case "data":
                // representation we get from the server is the same, whether
                // we're querying /api/devices/../data or ../data/<stream>,
                // so just cut the response down to the items array
                if (!res) {
                    res = {items: []};
                }
                response = [];
                var length = res.items.length;
                for (var i = 0; i < length; i++) {
                    // Go over all received data points, and change the
                    // timestamps to numbers, if possible.
                    var _item = res.items[i];
                    var item = _item;
                    if ("currentValue" in item) {
                        // Need to go one level deeper to find the timestamp.
                        item = item.currentValue;
                    }
                    if (typeof item.timestamp !== "number") {
                        // Attempt to change timestamp to number
                        var parsed = _.parseInt(item.timestamp);
                        if (_.isNaN(parsed)) {
                            // Couldn't parse as number.
                            console.error("Couldn't parse timestamp", item.timestamp);
                            continue;
                        } else {
                            item.timestamp = parsed;
                        }
                    }
                    response.push(_item);
                }
                break;
        }
        return response;
    });
})
.service('cloudKitApi', function (Restangular, $http, $q, $log) {
    var login = function (username, password, cloud, persistent) {
        var deferred = $q.defer();
        var postData = {
            username: username,
            password: password,
            cloud_fqdn: cloud,
            persistent_session: persistent
        };
        $http.post('/api/login', postData)
            .success(function () {
                $log.info(arguments);
                deferred.resolve();
            })
            .error(function (_, status) {
                var reason = {status: status};
                if (status === 401) {
                    reason.message = "Username or password was incorrect.";
                } else {
                    reason.message = "Unexpected status code: " + status;
                }
                deferred.reject(reason);
            });
        return deferred.promise;
    }

    var dashboard = function () {
        var dash = Restangular.one('dashboards').get();
        return dash;
    }

    var _sanitize_widgets = function (widgets) {
        _.each(widgets, function (widget) {
            _.forOwn(widget, function (val, key) {
                if (key.charAt(0) === "$") {
                    delete widget[key];
                }
            });
        });
    }

    var post_dashboard = function (widgets) {
        var dfd = $q.defer();
        _sanitize_widgets(widgets);
        $http({withCredentials: true,
               method: 'POST',
               url: '/api/dashboards',
               data: JSON.stringify({widgets: widgets})
        }).success(function () {
            dfd.resolve();
        }).error(function () {
            dfd.reject(arguments);
        });

        return dfd.promise;
    }

    var update_widgets = function (url, widgets) {
        var dfd = $q.defer();
        _sanitize_widgets(widgets);
        $http({withCredentials: true,
               method: 'PUT',
               url: url,
               data: JSON.stringify({widgets: widgets})
        }).success(function() {
                dfd.resolve()
        }).error(function() {
            dfd.reject(arguments)
        });

        return dfd.promise;
    }

    var devices = function (device) {
        if (device === null || device === undefined) {
            // Make the behavior the same as calling
            // Restangular.one('devices').get()
            device = undefined;
        }

        return Restangular.one('devices', device).get();
    }

    var device_config = function (device, section, query_params) {
        if (device === null || device === undefined) {
            throw new Error("Cannot call without providing a device ID");
        }

        var params = {};
        if(query_params){
            params = query_params;
        }

        return Restangular.one("devices", device).one("config", section).get(params);
    }

    var device_config_apply = function (device, section, config) {
        if (device === null || device === undefined) {
            throw new Error("Cannot call without providing a device ID");
        }

        return Restangular.one("devices", device).one("config", section).customPUT(config);
    }

    var device_config_apply_stock = function (device) {
        if (device === null || device === undefined) {
            throw new Error("Cannot call without providing a device ID");
        }

        return Restangular.one("devices", device).one("config-stock").put();
    }

    var provision_device_mac = function (mac) {
        if (mac === null || mac === undefined) {
            throw new Error("Must provide a MAC address to provision!");
        }
        var baseDevices = Restangular.all('devices');
        return baseDevices.post({mac: mac});
    }

    var device_data = function (device) {
        return Restangular.one('devices', device).getList("data");
    }

    var device_data_stream = function (device, stream) {
        var streamName = device + "/" + stream;
        return Restangular.one('devices', device).one('data', streamName).getList();
    }

    //=============================
    // Related to /api/user

    var user_info = null;
    var user_info_populated = false;

    var user = function () {
        // Return a deferred object, so that calling cloudKitApi.user has a
        // consistent interface.
        var deferred = $q.defer();

        // Cache user info after the first time we fetch it.
        if (user_info_populated) {
            deferred.resolve(user_info);
        } else {
            var fetch_user = Restangular.one('user').get();
            fetch_user.then(function (user) {
                user_info_populated = true;
                user_info = user;
                deferred.resolve(user);
            }, function (response) {
                $log.error("Failed to load user info", response);
                deferred.reject(["Failed to load user info", response]);
            });
        }
        return deferred.promise;
    }

    var output = function (device, obj_or_name, value) {
        if (_.isEmpty(device)) {
            // No device specified.
            throw new Error("Invalid device argument to .output", device);
        }

        if (_.isEmpty(obj_or_name)) {
            // No data passed in to send down. Throw an error
            throw new Error("No data passed to .output API!");
        }

        var deferred = $q.defer();

        var api_obj;
        if (_.isPlainObject(obj_or_name)) {
            // Called the API with an object. Send that object down.
            api_obj = obj_or_name;
        } else {
            // Assume called as output(<stream>, <value>)
            api_obj = {};
            api_obj[obj_or_name] = value;
        }

        $http.put('/api/devices/' + device + '/io', api_obj, {withCredentials: true})
        .success(function () {
            deferred.resolve(arguments);
        })
        .error(function () {
            deferred.reject(arguments);
        });

        return deferred.promise;
    }

    //=============================
    // The cloudKitApi API

    var api = {
        login: login,
        dashboard: dashboard,
        post_dashboard: post_dashboard,
        update_widgets: update_widgets,
        devices: devices,
        device_config: device_config,
        device_config_apply: device_config_apply,
        device_config_apply_stock: device_config_apply_stock,
        device_data: device_data,
        device_data_stream: device_data_stream,
        provision_device_mac: provision_device_mac,
        user: user,
        output: output
    };

    return api;
});
