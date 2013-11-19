/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('timeoutWidget', function (widgetRegistry, utils, $log, cloudKitApi, notificationService) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            scope.value = undefined;
            scope.display_value = undefined;
            scope.$update = null;
            scope.server_value = 0;
            scope.slideCb = function (value) {
                scope.display_value = value;
            };
            var type = 'timeout';
            var spec = widgetRegistry.get(type);
            utils.postlinkWidget(type, scope, element, spec);
            // Any more fancy footwork can be done here.

            cloudKitApi.device_config(scope.widget.device, 'InputOutput', {cache: "true"}).then(function(resp) {
                try {
                    var value = resp.sci_reply.send_message.device
                        .rci_reply.query_setting.InputOutput[scope.widget.setting];
                    if (value === undefined) {
                        return;
                    }
                    //Missing radix parameter
                    //jshint -W065
                    scope.value = scope.server_value = parseInt(value);
                    scope._server_value_is_fresh = true;
                    scope.display_value = scope.value;
                } catch (e) {
                    $log.error(e);
                }
            });

            scope.$watch('value', function (newval, oldval) {
                if (newval === scope.server_value) {
                    if (newval !== undefined && scope._server_value_is_fresh) {
                        // Just an update from querying the device config on widget
                        // creation. Ignore.
                        scope._server_value_is_fresh = false;
                        return;
                    }
                    else if (newval === undefined) {
                        // If newval is undefined, and since we're in this
                        // block server_value is undefined, we're most likely
                        // in the middle of widget initialization. Ignore this
                        // value update.
                        return;
                    }
                    // Otherwise the server value isn't "fresh", i.e. we've
                    // come through this if-block before, when we received the
                    // server value from the device_config query. We MUST NOT
                    // ignore this update, since this means the slider has
                    // moved to have the same value as server_value (which we
                    // never update except for on widget creation).
                }
                if (newval === undefined && oldval !== undefined) {
                    // value changed to undefined from something else - it's a
                    // sign from the ui-slider directive that dragging has
                    // begun. Stop the timeout for sending the latest setting,
                    // if applicable.
                    $log.debug("Slider started being dragged...");
                    if (scope.$update) {
                        utils.cancelTimeout(scope.$update);
                        scope.$update = null;
                    }
                    return;
                }
                // newval is undefined, oldval is undefined --> widget was just
                // created. Ignore this trigger of the watch
                else if (newval === null || newval === undefined) {
                    return;
                }

                $log.debug("Slider value updated to " + newval);
                if (scope.$update) {
                    utils.cancelTimeout(scope.$update);
                }
                scope.$update = utils.timeout(function () {
                    scope.state = 1;
                    $log.debug("Setting " + scope.widget.setting + " to " + newval);
                    cloudKitApi.output(scope.widget.device, scope.widget.setting, newval).then(function () {
                        $log.info("Successfully set " + scope.widget.setting + ": " + newval);
                    }, function () {
                        $log.error("Failed to set " + scope.widget.setting, arguments);
                        notificationService.error(
                            "Failed to write timeout setting for " + scope.widget.setting,
                            "Timeout setting failed");
                    })['finally'](function () {
                        if (scope.state === 1) {
                            scope.state = 0;
                        }
                    });
                    scope.$update = null;
                }, 1000);
            });
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/timeoutWidget/timeoutWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'simpleDataHolder',
            scope: { widget: "=timeoutWidget", state: "=" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'timeout';
        var widget_description = 'Timeout Slider Widget';
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [3, 1],
            // description appearing in 'Widget Type' list when adding new
            // widgets
            description: widget_description,
            directive: "timeout-widget",
            // camel-case version of directive
            directive_c: "timeoutWidget",

            // properties pertaining to widget settings
            /*
            has_input: does the widget's data get updated from Device Cloud?
            sends_output: does the widget send data to the device?
            input_xform: can the user specify a custom transformation to apply
                            to incoming data? (optional)
            options: list of objects defining the settings associated with this
                        widget type
                - options generally follow the Revalidator API
                    (http://github.com/flatiron/revalidator)
            */
            has_input: false,
            sends_output: false,
            options: [
                {key: "setting", type: "string", label: "Setting", required: true,
                 format: "timeout"},
                {key: "low", type: "number", label: "Low value", required: false,
                 minimum: 0, maximum: 6000, "default": 0},
                {key: "high", type: "number", label: "High value",
                 required: false, minimum: 0, maximum: 6000, "default": 6000,
                 dependencies: 'low', conform: function (val, obj) {
                     var low = obj.low;
                     return low < val;
                 },
                 messages: {conform: "High value must be greater than low value"}
                },
                {key: "step", type: "number", label: "Step Size", required: false,
                 minimum: 1, "default": 1}
            ]
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
