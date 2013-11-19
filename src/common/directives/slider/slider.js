/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.directive('uiSlider', function (utils, $log) {
    var linker = function (scope, element) {
        scope.$slider = $(element);
        scope.$slider.slider({
            value: scope.in_value || 0,
            range: scope.range || "min",
            min: scope.min,
            max: scope.max,
            step: scope.step,
            slide: function (event, ui) {
                event.stopPropagation();
                if (scope.slideCb) {
                    scope.$apply(function () {
                        try {
                            scope.slideCb(ui.value);
                        } catch (e) {
                            $log.error(e);
                        }
                    });
                }
            },
            start: function (event) {
                // stop drag event from propagating further up the DOM
                // (i.e. don't drag widget when dragging slider)
                event.stopPropagation();
                // Set the out_value to undefined, let the user of the slider
                // know that sliding has begun thusly.
                scope.$apply(function () {
                    scope.out_value = undefined;
                });
            },
            stop: function (event, ui) {
                // stop drag event from propagating further up the DOM
                // (i.e. don't drag widget when dragging slider)
                event.stopPropagation();
                // Set the out_value when dragging stops.
                scope.$apply(function () {
                    scope.out_value = ui.value;
                });
            }
        });

        // Update slider position when in_value changes.
        scope.$watch('in_value', function (new_value) {
            scope.$slider.slider('value', new_value);
        });
    };

    return {
        replace: false,
        restrict: 'AE',
        link: linker,
        scope: {in_value: "=inValue", out_value: "=outValue",
                min: "=", max: "=", step: "=?", range: "=?", slideCb: "=?"}
    };
});
