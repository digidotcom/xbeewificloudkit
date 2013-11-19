/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('barGraphWidget', function (widgetRegistry, utils) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            scope.value = undefined;
            var type = 'bar-graph';
            var spec = widgetRegistry.get(type);
            var dataUpdate = _.bind(scope.updateHandler, scope);
            utils.postlinkWidget(type, scope, element, spec, dataUpdate);
            // Any more fancy footwork can be done here.
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/barGraphWidget/barGraphWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'simpleDataHolder',
            scope: { widget: "=barGraphWidget" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Application Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'bar-graph';
        var widget_description = 'Bar Graph Widget (Horizontal)';
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [3, 1],
            directive: "bar-graph-widget",
            // camel-case version of directive
            directive_c: "barGraphWidget",

            description: widget_description,

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
