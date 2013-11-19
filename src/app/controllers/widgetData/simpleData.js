/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .controller('simpleDataHolder', function ($log, $scope, $parse) {
        $scope.value = null;
        var _lastTimestamp = $scope._lastTimestamp = 0;

        $scope.updateHandler = function (newData) {
            if (_lastTimestamp >= newData.timestamp) {
                // We got 'new' data that's actually older than something we
                // got before. Ignore this new point.
                return;
            }
            _lastTimestamp = $scope._lastTimestamp = newData.timestamp;
            if ($scope.widget.transform){
                try{
                    var trans_fn = $parse($scope.widget.transform);
                    var trans_scope = {};
                    // Set a bunch of common variable names user might have in expression
                    _.each(['value', 'val', 'input', 'x'], function(k){
                        trans_scope[k] = newData.value;
                    });

                    $scope.value = trans_fn(trans_scope);
                } catch (err) {
                    $log.error("Attempted to use a bad tranformation expression!", $scope.widget.transform)
                    $scope.value = NaN;
                }
            } else {
                $scope.value = newData.value;
            }
        }
    });
