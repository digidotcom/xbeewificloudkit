/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('errorWidget', function (widgetRegistry, utils) {
        // called after DOM element is compiled
        var linker = function postLink(scope, element) {
            scope.$element = element;
            var type = 'error';
            var spec = widgetRegistry.get(type);
            utils.postlinkWidget(type, scope, element, spec);
        };

        // AngularJS directive setup
        return {
            templateUrl: "widgets/errorWidget/errorWidget.tpl.html",
            restrict: 'AE',
            link: linker,
            controller: 'errorWidgetCtrl',
            scope: { widget: "=errorWidget" }
        };
    })
    .controller('errorWidgetCtrl', function($scope, $modal) {
        $scope.showError = function () {
            $modal.open({
                templateUrl: 'widgets/errorWidget/errorWidget-modal.tpl.html',
                controller: 'errorWidgetModalCtrl',
                backdrop: true,
                resolve: {
                    widget: function () {
                        return $scope.widget;
                    }
                }
            });
        };
    })
    .controller('errorWidgetModalCtrl', function($scope, $modalInstance, widget) {
        $scope.sanitized = _.omit(widget, ["$error", "$$hashKey", "$type", "$gridPos"]);
        $scope.title = "Widget Error";
        $scope.message = widget.$error.toString();
    })
    .run(function(widgetRegistry) {
        var widget_type_key = 'error';
        var widget_spec = {
            // Whether or not the widget is built-in or user-created
            // (i.e., whether the code is in /src/app or /src/common)
            builtin: true,
            // Don't show this widget type in the list
            hidden: true,
            size: [2, 1],
            description: "Error Widget",
            directive: "error-widget",
            directive_c: "errorWidget",

            has_input: false,
            sends_output: false,
            options: []
        };

        widgetRegistry.put(widget_type_key, widget_spec);
    });
