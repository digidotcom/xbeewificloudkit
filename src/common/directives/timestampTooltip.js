/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('timestampTooltip', function ($log) {
        var compile = function (element) {
            element.attr('tooltip', '_title');
            element.attr('tooltip-placement', 'bottom');

            return linker;
        };

        var linker = function postLink(scope, element, attrs) {
            var el = $(element);
            el.attr('data-toggle', 'tooltip');
            el.tooltip({placement: "bottom"});
            scope._title = "Widget has not received data.";

            scope.$watch(attrs.timestampTooltip, function (newtime) {
                $log.debug("new timestamp:", newtime);
                if (newtime !== undefined) {
                    // Timestamps generally come in as strings. We need to
                    // parse these strings to number form.
                    var time = _.parseInt(newtime);
                    if (_.isNaN(time)) {
                        scope._title = "As of timestamp " + newtime;
                    } else {
                        scope._title = "As of " + new Date(time).toLocaleString();
                    }
                } else {
                    // Directive was just created, or we got undefined for a
                    // timestamp. Don't update anything.
                }
            });
            scope.$watch('_title', function (newTitle) {
                el.attr('title', newTitle)
                    .tooltip('fixTitle');
            });
        };

        return {
            restrict: 'AE',
            compile: compile
        };
    });



