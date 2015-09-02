/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('onOffWidget', function (widgetRegistry, utils, $log) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'on-off';
            var spec = widgetRegistry.get(type);

            scope.server_state = undefined;

            utils.postlinkWidget(type, scope, element, spec, scope.updateHandler);
            // Any more fancy footwork can be done here.

            scope.$watch('value', function (newData, old) {
                if (newData === old) {
                    // will happen on widget initialization
                    return;
                }
                $log.debug("On/off display data update:", newData, old);
                scope.server_state = (scope.widget.invert ? !newData : newData);
            });
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/onOffDisplayWidget/onOffDisplayWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'simpleDataHolder',
            scope: { widget: "=onOffWidget", widgetState: "=state" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Application Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'on-off';
        var widget_description = 'On/Off Display Widget';

        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [2, 2],
            directive: "on-off-widget",
            // camel-case version of directive
            directive_c: "onOffWidget",

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
            has_input: true,
            sends_output: false,
            options: [
                {key: "invert", label: "Invert Values", type: "boolean",
                 required: false, "default": false}
            ]
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
