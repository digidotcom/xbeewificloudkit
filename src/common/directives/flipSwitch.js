/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('flipSwitch', function ($log, utils) {
        var makeSwitch = function (element, read_only) {
            var strokecolor = "#777";
            var fillcolor = "#69d6ff";
            var innerStrokeColor = "#24a7d8"
            var disabledColor = "#c4c4c4";
            var disabledStrokeColor = "#A0A0A0";
            //jshint -W064
            //(missing 'new' prefix when invoking a constructor)
            // This is the correct syntax for using Raphael.
            var el = Raphael(element, 200, 120);
            var outer = el.rect(10, 50, 180, 60, 8);
            outer.attr({
                fill: "#fff",
                stroke: strokecolor,
                "stroke-width": 0.5
            });
            var inner = el.rect(10, 50, 90, 60, 8);
            inner.attr({
                fill: fillcolor,
                stroke: innerStrokeColor
            });
            outer.translate(0.5, 0.5);
            inner.translate(0.5, 0.5);

            var innershadow = inner.glow({color: "#888", offsetx: 1, offsety: 4, fill: "#888", width: 4});

            var offText = el.text(55, 30, "OFF");
            var onText = el.text(145, 30, "ON");
            var textAttr = {
                "font-size": 24,
                fill: "#333",
                "font-weight": "bold"
            };
            var glow = {color: "#fff", fill: "#fff", width: 4};
            offText.attr(textAttr).glow(glow);
            onText.attr(textAttr).glow(glow);
            onText.attr("fill", "#c4c4c4");

            var contents = el.set();
            function makePath(x) {
                var p = el.path("M" + x + ",61L" + x + ",99");
                p.attr({fill: "#24a7d8", opacity: 0.3});
                var g = p.glow({color: "#9fe5ff", width: 2, offsetx: 1, offsety: 1});
                p.translate(0.5, 0.5);
                contents.push(p, g);
            }
            if (!read_only) {
                var i;
                for (i = 24; i < 95; i += 9) {
                    makePath(i);
                }
            }

            function switchOn() {
                //innershadow.transform("T90,0");
                contents.transform("T90,0");
            }
            function switchOff() {
                //innershadow.transform("");
                contents.transform("");
            }

            function setDisabled(disable){
                if(disable){
                    inner.attr("fill", disabledColor);
                    inner.attr("stroke", disabledStrokeColor);
                } else {
                    inner.attr("fill", fillcolor);
                    inner.attr("stroke", innerStrokeColor);
                }
            }

            contents.push(inner, innershadow);



            return {
                el: el,
                outer: outer,
                inner: inner,
                innershadow: innershadow,
                offText: offText,
                onText: onText,
                switchOn: switchOn,
                switchOff: switchOff,
                setDisabled: setDisabled
            }
        }

        var linker = function postLink(scope, element) {
            scope.$svg = makeSwitch(element[0], scope.read_only);
            if(scope.read_only){
                scope.$clickable = false;
            } else {
                scope.$clickable = true;
            }
            scope.switch_state = scope.input;

            function toggle(on) {
                var svg = scope.$svg;
                if (on) {
                    //svg.inner.attr({x: 100});
                    svg.switchOn();
                    svg.offText.attr("fill", "#c4c4c4");
                    svg.onText.attr("fill", "#333");
                }
                else {
                    //svg.inner.attr({x: 10});
                    svg.switchOff();
                    svg.offText.attr("fill", "#333");
                    svg.onText.attr("fill", "#c4c4c4");
                }
            }

            scope.$re_enable_timeout = null;

            scope.$watch('input', function (newState) {
                // Stop the delayed re-enabling - we're re-enabling here anyway
                if (scope.$re_enable_timeout) {
                    utils.cancelTimeout(scope.$re_enable_timeout);
                    scope.$re_enable_timeout = null;
                }
                scope.switch_state = newState;
                scope.$clickable = true;
                scope.$svg.setDisabled(false);
                toggle(newState);
            }, true);

            var switch_enable_delay = 20000;

            var toggleSwitchState = function (scope) {
                $log.debug("Clickable", scope.$clickable, "Old State", scope.switch_state,
                    "New State", !scope.switch_state);
                if (!scope.$clickable) {
                    return;
                }
                scope.$clickable = false;
                scope.$svg.setDisabled(true);
                scope.output = {state: !scope.switch_state};
                // Disable for a bit to prevent repeated clicks, indicate waiting
                scope.$re_enable_timeout = utils.timeout(function () {
                    scope.$clickable = true;
                    scope.$svg.setDisabled(false);
                    scope.$re_enable_timeout = null;
                }, switch_enable_delay);
            }
            element.bind('click', function () {
                if(!scope.read_only){
                    scope.$apply(toggleSwitchState);
                }
            });
        };

        return {
            restrict: 'AE',
            link: linker,
            scope: {input: "=inputModel", output: "=outputModel", read_only: "=readOnly"}
        };
    });


