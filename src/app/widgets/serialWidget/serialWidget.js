/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    //jshint -W098
    .controller('serialWidgetCtrl', function ($scope, utils, $log, cloudKitApi, notificationService) {
        $scope.data_sending = false;
        $scope.last_received_timestamp = undefined;

        $scope.getStreamUpdateHandler = function (newData) {
            // For the serial widget, data *should* come in as an object of the form
            //   {"content": "...", "format": "base64"}
            var _newData = newData.value;
            if (_.isEmpty(_newData)) {
                $log.warn("Serial widget got malformed data", newData);
                return;
            }
            var _timestamp = newData.timestamp;
            newData = _newData;

            if (newData.content !== undefined){
                // Check format to see if we should b64 decode
                var newText;
                if(newData.format === "base64"){
                    newText = utils.base64_decode(newData.content);
                } else {
                    newText = newData.content;
                }
                $scope.displaySerialText(newText, true);
                $scope.last_received_timestamp = _timestamp;
            } else {
                // TODO display some error?
                $log.warn('Serial widget got malformed data');
            }
        }

        $scope.setStreamUpdateHandler = function (newData) {
            // Updates to the set stream could be handled here too, as we use the same for get/set
            return;
        }

        $scope.serialEnterKeypress = function($event){
            if($scope.serialOutText){
               $scope.sendText($scope.serialOutText);
            }
            $event.preventDefault();
        }


        $scope.sendText = function(text) {
            $scope.data_sending = true;
            // Insert a CR before/after string to make it show on new line on both ends
            var text_cr = String.fromCharCode(13) + text + String.fromCharCode(13)

            cloudKitApi.output($scope.widget.device, $scope.widget.sets, text_cr).then(
                function(result){
                    // On success, show the sent text
                    $scope.displaySerialText(text_cr, false);
                    // Clear the input box for next entry
                    $scope.serialOutText = null;
                    // Reenable input
                    $scope.data_sending = false;
                },
                function(reason){
                    notificationService.error("Error sending text. Please try again.");
                    // Reenable input
                    $scope.data_sending = false;
                });

        }

        $scope.$watch('data_sending', function (sending) {
            if (sending) {
                $scope.widgetState = 1;
            } else {
                $scope.widgetState = 0;
            }
        });
    })
    .directive('serialWidget', function (widgetRegistry, utils) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'serial';
            var spec = widgetRegistry.get(type);

            // See http://lodash.com/docs#bind
            // (dataUpdate simply calls scope.updateHandler)
            var getCallback = _.bind(scope.getStreamUpdateHandler, scope);
            var setCallback = _.bind(scope.setStreamUpdateHandler, scope);
            utils.postlinkWidget(type, scope, element, spec, getCallback, setCallback);
            // Any more fancy footwork can be done here.

            // Widget display area
            // Use jquery to find, Angular's jqlite doesn't support selector
            var output_pane = $(element).find(".serial-display");

            scope.displaySerialText = function(text, isInbound){
                var $newText = null;
                if(isInbound){
                    $newText = $('<span/>').addClass("serial-in");
                    // Show incomming text inline
                    // Split string to handle any Carriage Returns
                    if(text === "\r"){
                        $newText.append($('<br>'));
                    } else {
                        var snippets = text.split("\r");
                        _.each(snippets, function (snippet) {
                            // CR at start & end will make cause empty strings
                            if(snippet === ""){
                                $newText.append($('<br>'));
                            } else {
                                $newText.append($('<span/>').text(snippet));
                            }
                        });
                    }
                } else {
                    // Outgoing should be in it's own line
                    $newText = $('<p/>').text(text).addClass("serial-out");
                }
                $(output_pane).append($newText);
                $(output_pane).scrollTop($(output_pane)[0].scrollHeight);
            }
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/serialWidget/serialWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'serialWidgetCtrl',
            scope: { widget: "=serialWidget", widgetState: "=state" }
        };
    })
    // This function, referred to in AngularJS as a "run block", is called by
    // AngularJS after the injector is created and is used to bootstrap the
    // application. The XBee Wi-Fi Cloud Kit makes use of the run block
    // to add widget definitions to the widget registry at start-up.
    .run(function(widgetRegistry) {
        // Adding the widget to the widget registry
        var widget_type_key = 'serial';
        var widget_description = 'Serial Data Widget';
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // widget size: X,Y (columns, rows)
            size: [3, 2],
            // description appearing in 'Widget Type' list when adding new
            // widgets
            description: widget_description,
            directive: "serial-widget",
            // camel-case version of directive
            directive_c: "serialWidget",

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
            sends_output: true,
            options: []
        };

        // DO NOT CHANGE ANY CODE BELOW HERE.
        widgetRegistry.put(widget_type_key, widget_spec);
    });
