/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('switchWidget', function (widgetRegistry, utils, $log, cloudKitApi, notificationService) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'switch';
            var spec = widgetRegistry.get(type);

            scope.server_state = undefined;
            scope.local_state = undefined;

            utils.postlinkWidget(type, scope, element, spec, scope.updateHandler);
            // Any more fancy footwork can be done here.

            scope.$watch('value', function (newData, old) {
                if (newData === old) {
                    // will happen on widget initialization
                    return;
                }
                $log.debug("Switch data update:", newData, old);
                scope.server_state = (scope.widget.invert ? !newData : newData);
            });

            scope.$watch('local_state', function (newstate) {
                if (newstate !== undefined) {
                    var _newstate = newstate.state;
                    // Report the new state to the server.
                    var value;
                    if (scope.widget.invert) {
                        value = (_newstate ? 0 : 1);
                    } else {
                        value = (_newstate ? 1 : 0);
                    }
                    $log.debug("Flip switch changed! Sending up value:", value);
                    scope.widgetState = 1;
                    cloudKitApi.output(scope.widget.device, scope.widget.sets, value)
                    .then(function () {
                        $log.debug("Successfully set " + scope.widget.sets + " to " + value);
                    }, function () {
                        $log.error("Failed to set " + scope.widget.sets + " to " + value);
                        notificationService.error("Failed to set " + scope.widget.sets);
                    })['finally'](function () {
                        scope.widgetState = 0;
                    });
                }
            });
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/switchWidget/switchWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'simpleDataHolder',
            scope: { widget: "=switchWidget", widgetState: "=state" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Application Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'switch';
        var widget_description = 'On/Off Switch Widget';

        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [2, 2],
            directive: "switch-widget",
            // camel-case version of directive
            directive_c: "switchWidget",

            description: widget_description,

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
            sends_output: true,
            options: [
                {key: "invert", label: "Invert Values", type: "boolean",
                 required: false, "default": false}
            ]
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
