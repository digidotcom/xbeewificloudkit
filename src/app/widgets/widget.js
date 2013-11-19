/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .directive('widgetGenerator', function (widgetRegistry, $compile, $log,
                                            utils, $state, $templateCache,
                                            deviceStatus) {
        var simplify = function (widget) {
            var w = _.omit(widget, ["$$hashKey", "$gridPos", "$error", "$type"]);
            return w;
        }

        return {
            restrict: 'A',
            //replace: true,
            require: '^gridster',
            scope: {widget: "="},
            link: function postLink(scope, element, attrs, controller) {
                var sizex = 2, sizey = 2;

                var in_reg, template, col, row;
                try {
                    if (!_.isPlainObject(scope.widget)) {
                        throw new Error("Got a non-Object widget! " +
                                        JSON.stringify(scope.widget));
                    }
                    if (!("type" in scope.widget)) {
                        // Widget doesn't specify a type: that's necessary!
                        throw new Error("No widget type specified.");
                    }
                    in_reg = widgetRegistry.get(scope.widget.type);
                    if (in_reg) {
                        // The widget type is registered - verify it.
                        utils.verify_widget(scope.widget, in_reg);
                    } else {
                        // The widget isn't in the registry...
                        var widget = JSON.stringify(simplify(widget));
                        var errmsg = "Widget type \"" + scope.widget.type +
                                     "\" not in registry.";
                        throw new Error(errmsg);
                    }

                    //$log.debug("Got widget sizes from registry:", scope.widget.type, in_reg.size);
                    sizex = in_reg.size[0];
                    sizey = in_reg.size[1];

                    if (sizex < 2) {
                        throw new Error("Bad widget specification: widgets must be at least two cells wide.");
                    }

                    if (scope.widget._gridPos) {
                        var pos = scope.widget._gridPos;
                        col = pos.col;
                        row = pos.row
                    }
                } catch (e) {
                    $log.error(e);
                    scope.widget.$type = "error";
                    scope.widget.$error = e;
                    in_reg = widgetRegistry.get("error");
                    //$log.debug("Got widget sizes from registry:", scope.widget.type, in_reg.size);
                    sizex = in_reg.size[0];
                    sizey = in_reg.size[1];
                }
                scope.widgetState = 0;

                // Device Connectivity indicator
                scope.deviceConnected = false;
                scope.$watch(function(){
                    return deviceStatus.device_status_map[scope.widget.device];
                }, function(newVal) {
                    scope.deviceConnected = Boolean(parseInt(newVal));
                })

                var calculateWrapperHeight = function () {
                    var ycells = sizey;
                    var headerOffset = 32; // experimentally determined
                    var spaceSize = 16; // space between grid cells
                    var spaceCells = ycells - 1;
                    var rv = (100 * ycells) + (spaceCells * spaceSize);
                    return rv - headerOffset;
                }

                template = $templateCache.get("widgets/widget.tpl.html");
                // Adds the necessary widget directive attribute to the widget
                // template being rendered.
                // This could be written more concisely using jQuery, but
                // unnecessary mixing of jQuery and AngularJS is frowned upon.
                var widgetify = function (element, classname, directive) {
                    var divs = element.find("div");
                    var i;
                    for (i = 0; i < divs.length; i++) {
                        if (divs[i].className === classname) {
                            var wrapper = angular.element(divs[i]);
                            wrapper.attr(directive, "widget");
                            wrapper.css("height", "" + calculateWrapperHeight() + "px");
                            return;
                        }
                    }
                }

                // Dynamically compile the correct widget template.
                // onehungrymind.com/angularjs-dynamic-templates
                element.html(template);
                widgetify(element, "widgetwrap", in_reg.directive);
                $compile(element.contents())(scope);

                var $ = $ || jQuery;
                $(element).addClass("widget widget-container-" + scope.widget.type);
                if (col && row) {
                    controller.add_widget(element, sizex, sizey, col, row);
                }
                else {
                    controller.add_widget(element, sizex, sizey);
                }
                scope.$on("$destroy", function() {
                    //$log.info("Removing widget:", element);
                    //debugger;
                    controller.remove_widget(element);
                });

                // Special handling of non-propagating mousedown events.
                // Event handler is bound to the div.widget-holder, which is
                // just inside the 'widget' as a whole. Since the 'widget' is
                // the element added to Gridster, we want to stop propagation
                // before these mouse events reach it.
                $(element).find(".widget-holder")
                          .on("mousedown", ".no-widget-mouse-down",
                              function (e) {
                    e.stopPropagation();
                }).on("mousedown", function (event) {
                    // Don't begin dragging a widget if the drag event didn't
                    // start somewhere within the widget header (this makes it
                    // so the user must click and drag from the header to move
                    // a widget)
                    if (!$(event.target).closest(".widget-header").length) {
                        event.stopPropagation();
                    }
                    // Prevent clicking and activating one of the widget
                    // header links, if the drag started there. Or perhaps
                    // abort dragging in that case.
                    else {
                        if ($(event.target).closest("a").length) {
                            event.stopPropagation();
                        }
                    }
                });
            }
        };
    });
