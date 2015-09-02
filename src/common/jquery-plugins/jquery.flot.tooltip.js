/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

/*
 * jQuery + Flot Hover-Tooltip Extension
 * Digi International, Inc.
 *
 * Based on: http://www.pureexample.com/jquery-flot/tooltip-line-chart.html
 */

(function( $, undefined ) {
$.fn.UseTooltip = function(tooltip_id, parseFn) {
    var tid = tooltip_id;
    var currentItem = null;
    var parseFunction = parseFn;
    var tooltip = $('<div id="' + tid + '" class="graph-tooltip"></div>').css({
        position: "absolute",
        display: "none",
        top: 10,
        right: 25,
        border: 0,
        padding: 2,
        size: 10,
        "background-color": "#ccc",
        opacity: 0.8
    });
    tooltip.appendTo(this);

    $(this).bind("plothover", function (event, pos, item) {
        var samePoint = function (p1, p2) {
            return (p1 && p2 &&
                    (p1.datapoint[0] === p2.datapoint[0]) &&
                    (p1.datapoint[1] === p2.datapoint[1]));
        }

        if (item) {
            if (samePoint(currentItem, item)) {
                // Still hovering over the same point - don't need to do
                // anything here.
                return;
            }
            currentItem = item;
            tooltip.html(parseFunction(item.datapoint[0], item.datapoint[1]));
            tooltip.show();
        }
        else {
            currentItem = null;
            tooltip.hide();
        }
    })
}
})( jQuery );
