/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .controller('lineGraphWidgetCtrl', function ($scope, $log) {
        $scope.data = [];
        $scope.$lastUpdated = null;

        $scope.addData = function (point) {
            // addData is written with the assumption that most new data points
            // will be added in chronological order, which means that adding a
            // new data point will happen very quickly. If, however, new data
            // is added very out-of-order (say, in reverse chronological order)
            // then this may be quite inefficient.
            var len = $scope.data.length;
            var idx;
            var timestamp = point[0];
            // Iterate from the end of the data list until we find a point
            // where the new point fits in, chronologically.
            for (idx = len - 1; idx >= 0; idx--) {
                if (timestamp >= $scope.data[idx][0]) {
                    // Found the place where the incoming data point belongs.
                    // However, we must first check if the timestamps are the
                    // same. If they are, ignore this new data point.
                    // Use + notation to cast both values to numbers, so that
                    // triple-equals works properly
                    if (+timestamp === +$scope.data[idx][0]) {
                        $log.debug("Got duplicate point:", point, "Original:", $scope.data[idx]);
                        return;
                    }
                    break;
                }
            }
            // Insert the new data point at the appropriate point.
            $scope.data.splice(idx + 1, 0, point);
            $scope.$lastTime = $scope.data[len][0];
            $scope.$lastUpdated = new Date().getTime();
        }
    })
    .directive('lineGraphWidget', function (widgetRegistry, utils, $log, $parse, cloudKitApi) {
        // Note: The functions defined here (outside of the link function) must
        // have the scope passed in as an argument (i.e. we can't just hold a
        // reference to the scope in a local variable). I suspect that when
        // there are local variables inside the directive function, those
        // variables are shared by ALL such directives. This was causing a
        // major issue with the line graph widgets, where the graphs would be
        // at least partially rendered, but then the actual graph data would
        // only show up in the last graph to be rendered. The solution is to
        // NOT hold a reference to the scope in the directive, and instead to
        // pass the scope into calls of these functions.
        // - mwadsten, 10/25/13

        // Go over the graph data, dropping any data points that are past the
        // left side of the visible graph and updating the X-axis range to
        // match resulting data set (i.e. set X-axis max to around latest
        // timestamp)
        var cleanUpData = function (scope) {
            var xAxisOpts = scope.$graph.getOptions().xaxes[0];
            var sec = 1e3;
            xAxisOpts.max = scope.$lastTime + 3*sec;
            xAxisOpts.min = scope.$lastTime - (scope.widget.timespan + 3)*sec;
            var length = scope.data.length;
            for (var i = 0; i < length; i++) {
                if (scope.data[i][0] >= xAxisOpts.min) {
                    // There is an implicit assumption here that the data
                    // points in scope.data are in sorted order of timestamp.
                    break;
                }
                if (scope.data[i+1] && scope.data[i+1][0] >= xAxisOpts.min) {
                    // We want to leave one data point off the left edge of
                    // the graph, to give the appearance of continuity.
                    continue;
                }
                $log.debug("Dropping data point", scope.data[i]);
                scope.data.splice(i, 1);
                length--;
                i--;
                continue;
            }
        }

        var putData = function (scope, timestamp, value) {
            scope.addData([timestamp, value]);
            cleanUpData(scope);
        }

        var dataUpdate = function (scope, newData, oldData) {
            // Note: This function will be called with 'this' = undefined
            var data;
            if(scope.widget.transform){
                try{
                    var trans_fn = $parse(scope.widget.transform);
                    var trans_scope = {};
                    // Set a bunch of common variable names user might have in expression
                    _.each(['value', 'val', 'input', 'x'], function(k){
                        trans_scope[k] = newData.value;
                    });

                    data = trans_fn(trans_scope);

                } catch (err) {
                    $log.error("Attempted to use a bad tranformation expression!", scope.widget.transform)
                    data = NaN;
                }
            } else {
                data = newData.value;
            }

            $log.debug("Data update:", data, newData, oldData);
            var timestamp = new Date().getTime();
            putData(scope, timestamp, data);
        }

        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'line-graph';
            var spec = widgetRegistry.get(type);
            // Wrap dataUpdate function so first argument is always 'scope'
            var updateFn = _.bind(dataUpdate, undefined, scope);
            utils.postlinkWidget(type, scope, element, spec, updateFn);
            // Any more fancy footwork can be done here.

            var graphElement = $(element).find(".the-graph");
            scope.$lastUpdated = new Date().getTime();

            var graphOptions = {
                grid: {
                    hoverable: true, clickable: true, mouseActiveRadius: 10,
                    backgroundColor: "#fff"
                },
                colors: [ scope.widget.color ],
                series: {
                    points: {
                        show: true, radius: 2, symbol: "circle"
                    },
                    lines: {
                        show: true
                    }
                },
                xaxis: {
                    max: scope.$lastUpdated,
                    min: scope.$lastUpdated - (scope.widget.timespan * 1e3),
                    mode: "time",
                    tickSize: [scope.widget.ticksize, "second"],
                    timeformat: "%H:%M:%S",
                    timezone: "browser"
                },
                yaxis: {
                    min: (scope.widget.autoscale ? null : scope.widget.ymin),
                    max: (scope.widget.autoscale ? null : scope.widget.ymax),
                    timezone: "browser"
                }
            };

            scope.$graph = $.plot(graphElement, [], graphOptions);

            $(graphElement).UseTooltip(scope.widget.id + "__tooltip",
                                      function parser(time, value) {
                                          // Round to 4 decimal places
                                          var val = Math.round(value*1e4)/10000.0;
                                          return new Date(time).toUTCString() + " = " + val;
                                      });

            scope.$watch('$lastUpdated', function(val) {
                $log.debug("$lastUpdated changed?", val);
                if (val === undefined) {
                    // Widget initialization. Ignore change.
                    return;
                }
                scope.$graph.setData([scope.data]);
                scope.$graph.setupGrid();
                scope.$graph.draw();
            });

            scope.pd = putData;
            scope.du = dataUpdate;

            // cutoff for historical data is 'timespan' seconds ago
            var cutoff = new Date().getTime() - scope.widget.timespan*1e3;
            cloudKitApi.device_data_stream(scope.widget.device, scope.widget.gets).then(function (points) {
                var point;
                for (var i = 0; i < points.length; i++) {
                    point = points[i];
                    if (point.timestamp < cutoff) {
                        $log.debug("Skipping point because of cutoff");
                        continue;
                    }
                    $log.debug("Adding point " + point.timestamp + " " + point.data);
                    scope.addData([point.timestamp, point.data]);
                }
                cleanUpData(scope);
            });
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/lineGraphWidget/lineGraphWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'lineGraphWidgetCtrl',
            scope: { widget: "=lineGraphWidget" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Application Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'line-graph';
        var widget_description = "Line Graph Widget";
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [4, 3],
            directive: "line-graph-widget",
            // camel-case version of directive
            directive_c: "lineGraphWidget",

            description: widget_description,

            disable_autofetch: true,

            // properties pertaining to widget settings
            has_input: true,
            sends_output: false,
            input_xform: true,
            options: [
                {key: "color", label: "Color", required: false, type: "string",
                 format: "color", "default": "#FF6319"},
                {key: "timespan", label: "Timespan", required: false,
                 type: "number", "default": 90, minimum: 5, maximum: 1800},
                {key: "ticksize", label: "X-axis tick size", required: false,
                 type: "number", "default": 30, minimum: 2, maximum: 600},
                {key: "autoscale", label: "Y-axis autoscale", required: false,
                 type: "boolean", "default": true},
                {key: "ymin", label: "Y-axis minimum", required: false,
                 type: "number", "default": 0, minimum: 0, maximum: 10000},
                {key: "ymax", label: "Y-axis maximum", required: false,
                 type: "number", "default": 1000, minimum: 0, maximum: 10000,
                 conform: function (val, obj) {
                     var min = obj.ymin;
                     if (min === undefined) {
                         min = 0;
                     }
                     return min < val;
                 },
                 messages: {conform: "High value must be greater than low value"}}
            ]
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
