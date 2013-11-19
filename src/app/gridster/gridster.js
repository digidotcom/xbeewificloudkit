/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('gridster', function ($rootScope, $filter) {
        return {
            restrict: 'AE',
            link: function postLink(scope, element, attrs, controller) {
                controller.init(element, scope, scope);
            },
            controller: function() {
                var __grid = null;

                return {
                    init: function(element, scope) {
                        var options = scope.options;
                        __grid = $(element).gridster(options).data('gridster');
                        $rootScope.grid = __grid;
                        $rootScope.getWidgets = function() {
                            var widgets = __grid.serialize();
                            return $filter("sortByGridPosition")(widgets);
                        }
                    },
                    add_widget: function() {
                        __grid.add_widget.apply(__grid, arguments);
                    },
                    remove_widget: function(element) {
                        __grid.remove_widget(element);
                    }
                };
            }
        };
    });
