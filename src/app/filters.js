/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .filter('nonHiddenWidgets', function () {
        return function (items) {
            var result = [];
            angular.forEach(items, function (defn) {
                if (!defn.hidden) {
                    result.push(defn);
                }
            });

            return result;
        };
    })
    .filter('sortByGridPosition', function ($log) {
        var getRow = function (obj) {
            if (!_.has(obj, "_gridPos")) {
                return obj.row;
            } else {
                return obj._gridPos.row;
            }
        };
        var getCol = function (obj) {
            if (!_.has(obj, "_gridPos")) {
                return obj.col;
            } else {
                return obj._gridPos.col;
            }
        };

        return function (list) {
            // Special cases for very short lists, to improve performance on
            // dashboards with very few widgets.
            var len = (list || {length: 0}).length;
            if (len === 0) {
                return [];
            }
            if (len === 1) {
                return list;
            }
            var sortedList = _.sortBy(list, getRow);
            var rowGroups = _.groupBy(sortedList, getRow);
            var groups = [];
            angular.forEach(rowGroups, function (group) {
                var byColumn = _.sortBy(group, getCol);
                groups.push(byColumn);
            });
            return _.flatten(groups);
        }
    });
