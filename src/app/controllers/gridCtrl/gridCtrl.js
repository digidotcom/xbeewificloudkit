/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .controller('GridCtrl', function ($scope, dashboardService, $log,
                                      $timeout, $rootScope,
                                      notificationService, $state) {
        var serialize = function(jqelem, info) {
            var thewidget = angular.element(jqelem).scope().widget;
            return {
                widget: thewidget,
                col: info.col,
                row: info.row
            }
        };

        // Variables set in the gridster directive
        $rootScope.grid = null;
        $rootScope.getWidgets = function () { return []; };

        // Callbacks, etc. related to Gridster drag handlers
        $scope.save_dash_timeout = null;
        $scope.drag_start_handler = function () {
            if ($scope.save_dash_timeout) {
                // Abort saving the dashboard
                $log.debug("Aborting dashboard save.");
                $timeout.cancel($scope.save_dash_timeout);
                $scope.save_dash_timeout = null;
            }
            $log.debug("Gridster drag started.");
        }
        $scope.drag_stop_handler = function () {
            // This method is set in the gridster directive
            var serialized = $rootScope.getWidgets();
            $log.debug("Serialized dashboard:", serialized);
            var changed = false;
            _.each(serialized, function (obj) {
                var widget = obj.widget;
                var row = obj.row;
                var col = obj.col;
                if (!widget._gridPos) {
                    changed = true;
                    widget._gridPos = {};
                }
                if (widget._gridPos.row !== row) {
                    changed = true;
                    widget._gridPos.row = row;
                }
                if (widget._gridPos.col !== col) {
                    changed = true;
                    widget._gridPos.col = col;
                }
            });
            if (changed) {
                $scope.save_dash_timeout = $timeout(function () {
                    var toast = notificationService.info("Saving dashboard...");
                    dashboardService.update_widgets().then(function () {
                        $log.debug("Dashboard successfully saved.");
                    }, function () {
                        $log.debug("Dashboard did not save.");
                        notificationService.error("Dashboard failed to save.");
                    })['finally'](function () {
                        notificationService.cancel(toast);
                    });
                }, 2500);
            } else {
                $log.debug("Dashboard didn't change, not saving.");
            }
        }

        // Gridster options object
        $scope.options = {
            widget_margins: [8, 8],
            widget_base_dimensions: [100, 100],
            min_cols: 8,
            max_cols: 8,
            draggable: {
                start: $scope.drag_start_handler,
                stop: $scope.drag_stop_handler
            },
            serialize_params: serialize
        }

        $scope.widgets = [];
        dashboardService.widgets_uncached().then(function (widgets) {
            $scope.widgets = widgets;
        }, function (response) {
            $log.error("Failed to load dashboard in gridCtrl", response);
            // dashboardService.widgets_uncached and .widgets will reject their
            // promises with a list, where the first item is an error message.
            var msg = response[0];
            notificationService.error(msg, "Problem loading dashboard");
            $state.go('setup');
        });
    });
