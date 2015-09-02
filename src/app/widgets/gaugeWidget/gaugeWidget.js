/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('gaugeWidget', function (widgetRegistry, utils) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'gauge';
            var spec = widgetRegistry.get(type);

            // See http://lodash.com/docs#bind
            // (dataUpdate simply calls scope.updateHandler)
            var dataUpdate = _.bind(scope.updateHandler, scope);
            utils.postlinkWidget(type, scope, element, spec, dataUpdate);

            scope.value = undefined;
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/gaugeWidget/gaugeWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'simpleDataHolder',
            scope: { widget: "=gaugeWidget" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'gauge';
        var widget_description = 'Gauge Widget';
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [2, 2],
            // description appearing in 'Widget Type' list when adding new
            // widgets
            description: widget_description,
            directive: "gauge-widget",
            // camel-case version of directive
            directive_c: "gaugeWidget",

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
            input_xform: true,
            options: [
                {key: "units", type: "string", label: "Units", required: false,
                 "default": ""},
                {key: "low", type: "number", label: "Low value", required: false,
                 "default": 0},
                {key: "high", type: "number", label: "High value",
                 required: false, "default": 2500,
                 dependencies: 'low', conform: function (val, obj) {
                     var low = obj.low;
                     return low < val;
                 },
                 messages: {conform: "High value must be greater than low value"}}
            ]
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
