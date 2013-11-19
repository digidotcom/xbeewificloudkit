/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .controller('ViewCodeCtrl', function($scope, $log, utils, $state,
                                         $stateParams, widgetRegistry,
                                         notificationService) {
        utils.setTitle("View Widget Code");
        $scope.widget = {};
        $scope.fileName = '';
        utils.get_widget_by_id($stateParams.widget_id)
        .then(function (widget) {
            $log.debug("Looked up widget!", widget);
            if (_.isEmpty(widget)) {
                $log.info("There is no widget by that id");
                $state.transitionTo("dashboard");
                return;
            }
            $scope.widget = widget;

            var widgetEntry = widgetRegistry.get(widget.type);
            $scope.fileName = widgetEntry.directive_c;
            $scope.builtin = widgetEntry.builtin;
        }, function (response) {
            // response will consist of a list, where the first item is an
            // error message
            $log.error("Failed to fetch dashboard on view code page", response);
            var msg = response[0];
            notificationService.error(msg, 'Problem loading widget');
            $state.go("setup");
        });

        $scope.close = function () {
            $log.info($state);
            $state.transitionTo("dashboard");
        }
    })
    .directive('codeView', function($log, viewCodeApi, RepoUrlBase) {
        return {
            link: function drawSource(scope, element, attrs) {
                var fileType = scope.fileType = attrs.codeView;
                scope.title = attrs.title;
                scope.path = "";
                scope.code_url = RepoUrlBase;
                scope.$watch('widget', function (widget) {
                    if (_.isEmpty(widget)) {
                        return;
                    }
                    viewCodeApi.getCode(scope.fileName, fileType, scope.builtin)
                    .then(function(obj) {
                        scope.path = obj.path;
                        scope.code_url = RepoUrlBase + "/" + scope.path;
                        var codeEl = element.find("code");
                        codeEl.text(obj.source);
                        hljs.highlightBlock(codeEl[0]);
                        element.removeClass("hide");
                    }, function () {
                        $log.error("Failed to load file", arguments);
                    });
                });
            },
            replace: true,
            templateUrl: "view_code/code_view.tpl.html",
            scope: true,
            restrict: "A"
        }
    })
    .run(function ($rootScope, $state, $stateParams) {
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
    })
