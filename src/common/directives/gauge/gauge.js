/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.directive('gauge', function () {
    var linker = function postLink(scope, element) {
        scope.$el = $(element);
        // set the gauge element's ID
        scope.$el.find("#justgage").attr("id", scope.$id + '-justgage');
        scope.gauge = null;
        //scope.value = null;
        var options = {
            id: scope.$id + '-justgage',
            value: scope.value,
            titleFontColor: '#ffffff',
            max: scope.high,
            min: scope.low,
            title: "_",
            label: scope.units,
            gaugeWidthScale: 1.5,
            showInnerShadow: true,
            levelColorsGradient: true,
            levelColors: ['#89f6ff', '#69d6ff'],
            shadowOpacity: 0.5,
            shadowVerticalOffset: 5,
            counter: true,
            width: 190,
            height: 190

        };

        scope.$watch('value', function (newval) {
            if (scope.gauge === null) {
                scope.gauge = new JustGage(options);
                scope.$svg = scope.$el.find('svg');

                /*
                 * styling the gauge to suit our needs
                 */
                //removing title
                scope.$svg.find('text').first().remove();

                //differentiating value text from range text (thanks justgage!)
                var text = scope.$svg.find('text');
                text.eq(0).attr('class', 'value-text');
                text.eq(2).attr('class', 'range-text');
                text.eq(3).attr('class', 'range-text');

                //re-styling range text
                scope.$svg.find('.range-text').css('font-size', '12px');
                scope.$svg.find('.range-text').css('fill', '#000000');

                //hoisting elements up and making the svg shorter
                scope.$svg.children().attr('transform', 'translate(0,-40)');
                scope.$svg.height(140);

                //moving value and units text below the gauge
                text.eq(0).attr('transform', 'translate(0,-20)');
                text.eq(1).attr('transform', 'translate(0,-20)');

            }
            if (typeof newval !== 'undefined') {
                scope.value = newval;
                scope.gauge.refresh(newval);
            }
        });
    };
    return {
        restrict: 'A',
        replace: true,
        link: linker,
        template: '<div><div id="justgage"></div></div>',
        scope: {low: '@', high: '@', units:'@', value: '=ngModel'}
    }
});


