/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('progressBar', function () {
        var setProgress = function () {
            // Called as 'scope.setProgress() --> this = scope'
            var scope = this;
            var value = scope.value;
            scope.$bar.progressbar("option", {value: value});
            scope.$bar.attr('title', value);
            scope.$label.text( Math.round(value) ).attr('title', value);
        }

        var linker = function postLink(scope, element, attrs) {
            scope.$bar = $(element);
            scope.$label = scope.$bar.find(".progress-bar-label").first();
            var options = {
                value: 0,
                max: scope.max || 1023,
                min: scope.min || 0,
                vertical: scope.vertical || false
            };

            var piece = (scope.vertical ? "vertical-" : "");
            scope.$bar.addClass("the-" + piece + "progress-bar");
            scope.$label.addClass("the-" + piece + "progress-label");

            scope.$bar.progressbar(options);
            scope.setProgress = setProgress;
            scope.setProgress();

            scope.$watch(attrs.ngModel, function (newval) {
                scope.value = newval;
                scope.setProgress();
            });
            scope.$watch('low', function (newlow) {
                scope.$bar.progressbar("option", {min: newlow});
                scope.setProgress();
            });
            scope.$watch('high', function (newhigh) {
                scope.$bar.progressbar("option", {max: newhigh});
                scope.setProgress();
            });
        };

        return {
            restrict: 'A',
            replace: true,
            link: linker,
            template: '<div><div class="progress-bar-label"></div></div>',
            scope: {low: "@", high: "@", value: "=ngModel", vertical: "="}
        };
    });

