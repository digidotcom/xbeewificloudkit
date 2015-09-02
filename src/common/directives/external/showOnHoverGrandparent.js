/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

// Directive to show an element only when hovering over its parent.
// http://www.grobmeier.de/angular-js-the-show-on-mouseenter-hide-on=mouseleave-directive-31082012.html
// Modified for use with widgets. Hence, grandparent instead of parent.

angular.module('XBeeWiFiApp')
.directive('showonhovergrandparent', function() {
    return {
        link: function (scope, element) {
            var el = $(element);
            el.parent().parent().bind('mouseenter', function() {
                el.show();
            });
            el.parent().parent().bind('mouseleave', function() {
                el.hide();
            });
            el.hide();
        }
    };
});
