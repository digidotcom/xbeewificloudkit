/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.directive('tiltIndicator', function ($log) {
    var baseDimension = 280;

    var toCoords = function (scope, x, y) {
        var xprime = x, yprime = y;

        // Normalize x and y to a scale of roughly 0 to 1
        // Another way of writing these equations is:
        //   x' = (x' - (xrange / 2)) / xrange
        // The format below is less repetitious though
        xprime = (xprime / scope.xrange) - 0.5;
        yprime = (yprime / scope.yrange) - 0.5;

        // Convert 0-to-1 to pixel position. Indicator base is roughly 280x280
        // But we must adjust so the ball stays within the base circle.
        var dimension = baseDimension - 64;
        xprime *= dimension;
        yprime *= dimension;

        // We 'clipped' 32px off each side, so we need to account for that in
        // the coordinates we return
        return [xprime + 32, yprime + 32];
    }

    var moveTo = function (scope, x, y) {
        //$log.debug("moveTo", x, y);
        var coords = toCoords(scope, x, y);

        var final_x = coords[0];
        var final_y = coords[1];

        if (Raphael.type === "VML") {
            // Need to tweak final X,Y coordinates slightly, because older
            // versions of IE (without SVG support) don't draw the tilt
            // indicator quite correctly.
            //final_x -= 2;
            final_y -= 2;
        }

        scope.$ball.animate({cx: final_x, cy: final_y}, 500);
    }

    var makeIndicator = function (scope, element) {
        //jshint -W064
        //(missing 'new' prefix when invoking a constructor)
        // This is the correct syntax for using Raphael.
        var r = Raphael(element, 283, 283);

        // Generate the base of the tilt indicator (large circle)
        //jshint -W098
        //('base' is defined but never used)
        var base = r.image("/static/assets/tilt-widget/base.png", 0, 0, 280, 280);

        // Generate the little blue ball inside the tilt indicator
        var centerCoords = scope.toCoords(scope.xcenter, scope.ycenter);
        scope.$ball = r.circle(centerCoords[0], centerCoords[1], 23).attr({
            fill: "#69d6ff",
            stroke: "#49cdff",
            "stroke-width": 2,
            "fill-opacity": 0.9
        });

        // Generate the lines and innermost circle
        //jshint -W098
        //('top' is defined but never used)
        var top = r.image("/static/assets/tilt-widget/top.png", 0, 0, 280, 280).attr({
            opacity: 0.5
        });
        return {
            move: _.bind(moveTo, null, scope)
        }
    }

    var linker = function postLink(scope, element) {
        // Initialize with a stub animate function.
        scope.$ball = {animate: function () {}};
        scope.toCoords = _.bind(toCoords, null, scope);
        scope.moveTo = _.bind(moveTo, null, scope);

        var el = makeIndicator(scope, element[0]);
        scope.indicator = el;

        scope.$watch('x', function (val) {
            scope.moveTo(val, scope.y);
        });
        scope.$watch('y', function (val) {
            scope.moveTo(scope.x, val);
        });
    };

    return {
        restrict: 'A',
        link: linker,
        scope: {x: "=", y: "=", xcenter: "=", xrange: "=", ycenter: "=", yrange: "="}
    }
});



