/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

// Directive to automatically capitalize the input in a field.
// Based on http://stackoverflow.com/a/15253892

angular.module('XBeeWiFiApp')
.directive('capitalizeFirst', function() {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            var capitalize = function (value) {
                if (_.isEmpty(value)) {
                    return value;
                }
                var cap = value.toUpperCase();
                if (cap !== value) {
                    modelCtrl.$setViewValue(cap);
                    modelCtrl.$render();
                }
                return cap;
            }

            modelCtrl.$parsers.unshift(capitalize);
            capitalize(scope[attrs.ngModel]);
        }
    };
});

