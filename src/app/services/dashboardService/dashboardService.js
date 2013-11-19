/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('dashboardService', function dashboardService(cloudKitApi, $q, $log) {
        /*
         * This service's purpose is to provide the 'single source of truth'
         * about widgets in the dashboard across all pages of the application.
         * All access to widgets should be done by referencing widgets accecced
         * through this service (as opposed to calling cloudKitApi.dashboards()
         * directly).
         */

        var fetched = false;
        var dashboard_dfd = $q.defer();

        //update dashboard with a PUT to <url_dfd>

        //Fetches widgets from backend, stores url
        var get_dashboard = function () {
            fetched = true;
            cloudKitApi.dashboard().then(function(data) {
                dashboard_dfd.resolve(data);
            }, function (response) {
                dashboard_dfd.reject(response);
            });
            return dashboard_dfd.promise;
        }

        //Gets widgets if not already retrieved, otherwise returns cached
        var widgets = function () {
            var dfd = $q.defer();
            $log.debug('getting widgets', fetched)
            if (!fetched) {
                get_dashboard().then(function (dashboard) {
                    $log.debug('Loaded dashboard from server:', dashboard);
                    if (_.isEmpty(dashboard) || dashboard.url === null) {
                        // Some strange error occurred within cloudKitApi, or
                        // the user's account has no dashboards (hence, the
                        // loaded dashboard url is null)
                        $log.debug("Invalid dashboard, or user has no dashboards.");
                        dfd.reject(["No dashboards in your account.", dashboard]);
                        return;
                    }
                    // Otherwise, the dashboard should be okay, so resolve the
                    // promise with the list of widgets.
                    dfd.resolve(dashboard.widgets);
                }, function(response) {
                    dfd.reject(["Fetching dashboard failed", response])
                });
            } else {
                dashboard_dfd.promise.then(function(dashboard) {
                    $log.debug('Loaded cached dashboard:', dashboard)
                    if (_.isEmpty(dashboard) || dashboard.url === null) {
                        // Some strange error occurred within cloudKitApi, or
                        // the user's account has no dashboards (hence, the
                        // loaded dashboard url is null)
                        $log.debug("Invalid cached dashboard, or user has no dashboards.");
                        dfd.reject(["No dashboards in your account.", dashboard]);
                        return;
                    }
                    dfd.resolve(dashboard.widgets);
                }, function() {
                    dfd.reject(["Fetching dashboard failed"])
                });
            }
            return dfd.promise
        }

        var update_widgets = function () {
            var dfd = $q.defer();
            dashboard_dfd.promise.then(function (dashboard) {
                var url = dashboard.url;
                var resource = _.last(url.split(/com|org|net/));
                $log.debug(dashboard.widgets);
                cloudKitApi.update_widgets(resource, dashboard.widgets)
                    .then(function() {
                        $log.debug("update_widgets succeeded", arguments);
                        dfd.resolve();
                    }, function () {
                        $log.debug("update_widgets failed", arguments);
                        dfd.reject();
                    });
            });
            return dfd.promise;
        }

        var remove_widget = function (widget_id) {
            var dfd = $q.defer();
            dashboard_dfd.promise.then(function (dashboard) {
                var url = dashboard.url;
                var resource = _.last(url.split(/com|org|net/));
                var survivors = _.reject(dashboard.widgets, function(widget) {
                    return (widget.id === widget_id);
                });
                cloudKitApi.update_widgets(resource, survivors)
                    .then(function() {
                        dfd.resolve();
                    }, function() {
                        dfd.reject()
                    });
            });
            return dfd.promise;
        }

        var widgets_uncached = function () {
            $log.debug("Fetching widgets from server, uncached.");
            fetched = false;
            dashboard_dfd = $q.defer();
            return widgets();
        }

        // TODO: Could have these dynamically loaded/extended, etc
        var dashboard_layouts = [
            {
                description: "Cloud Kit (recommended)",
                definition: [
                    {
                        type: "tilt",
                        stream_y: "ADC/2",
                        stream_x: "ADC/3",
                        _gridPos: {
                            col: 5,
                            row: 1
                        },
                        id: "accelerometer1",
                        label: "Tilt"
                    },
                    {
                        low: 0,
                        units: "",
                        type: "gauge",
                        _gridPos: {
                            col: 1,
                            row: 3
                        },
                        high: 2500,
                        id: "potentiometer1",
                        label: "Potentiometer",
                        gets: "ADC/1"
                    },
                    {
                        read_only: false,
                        type: "switch",
                        invert: true,
                        sets: "DIO/7",
                        _gridPos: {
                            col: 3,
                            row: 5
                        },
                        id: "buzzer1",
                        label: "Buzzer Toggle"
                    },
                    {
                        pwm: "M1",
                        low: 0,
                        type: "slider",
                        _gridPos: {
                            col: 5,
                            row: 5
                        },
                        high: 1023,
                        id: "frquency1",
                        step: 1,
                        label: "Buzzer Frequency"
                    },
                    {
                        pwm: "M0",
                        low: 0,
                        type: "slider",
                        _gridPos: {
                            col: 5,
                            row: 4
                        },
                        high: 640,
                        id: "gauge1",
                        step: 64,
                        label: "LED Gauge"
                    },
                    {
                        read_only: false,
                        type: "switch",
                        invert: false,
                        sets: "DIO/9",
                        _gridPos: {
                            col: 1,
                            row: 1
                        },
                        id: "led1",
                        label: "User LED"
                    },
                    {
                        read_only: true,
                        type: "switch",
                        invert: true,
                        sets: "DIO/8",
                        _gridPos: {
                            col: 3,
                            row: 1
                        },
                        id: "switch1",
                        label: "User switch",
                        gets: "DIO/8"
                    },
                    {
                        type: "serial",
                        sets: "serial/0",
                        _gridPos: {
                            col: 5,
                            row: 6
                        },
                        id: "serial1",
                        label: "Serial Terminal",
                        gets: "serial/0"
                    },
                    {
                        read_only: false,
                        type: "switch",
                        invert: true,
                        sets: "DIO/6",
                        _gridPos: {
                            col: 3,
                            row: 3
                        },
                        id: "motor1",
                        label: "Motor Toggle"
                    },
                    {
                        read_only: true,
                        type: "switch",
                        invert: true,
                        sets: "DIO/4",
                        _gridPos: {
                            col: 1,
                            row: 5
                        },
                        id: "button1",
                        label: "User Button",
                        gets: "DIO/4"
                    }
                ]
            },
            {
                description: "Empty",
                definition: []
            }
        ];

        var make_dashboard = function (device_id, widget_def) {
            // set the 'device' field on each widget
            var widgets = _.map(widget_def, function (w) {
                // Clone each widget object so the originals are preserved.
                var widget = _.clone(w);
                widget.device = device_id;
                return widget;
            });
            return cloudKitApi.post_dashboard(widgets);
        }

        return {
            widgets: widgets,
            widgets_uncached: widgets_uncached,
            update_widgets: update_widgets,
            remove_widget: remove_widget,
            make_dashboard: make_dashboard,
            _dashboard_layouts: function () {
                // Return a deep clone of available layouts,
                // so that the original stock dashboard model here is preserved
                return _.clone(dashboard_layouts, true);
            }
        };
    });
