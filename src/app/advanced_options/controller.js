/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module("XBeeWiFiApp.advanced", [])
.controller("advancedOptionsCtrl", function ($scope, dashboardService, $http, $log, $state, utils) {
    utils.setTitle("Advanced Options");

    $scope.current_dash = null;
    $scope.error = null;
    $scope.getting_url = $scope.deleting_dash = false;

    var fetch_current = function () {
        $scope.getting_url = true;
        dashboardService.current_url().then(function (url) {
            $scope.current_dash = url;
            $scope.error = null;
        }, function (error) {
            $log.error("fetch_current", error);
            if (error === "No dashboards in your account.") {
                $scope.current_dash = null;
            } else {
                $scope.error = error;
            }
        })['finally'](function () {
            $scope.getting_url = false;
        })
    }
    fetch_current();

    $scope.delete_it = function () {
        $scope.deleting_dash = true;
        $http['delete']($scope.current_dash, {withCredentials: true}).then(function () {
            $log.info("Successfully deleted dashboard!");
            $state.go('setup');
        }, function (resp) {
            $log.error("Failed to delete dashboard:", resp.data);
            $scope.error = resp.data;
        })['finally'](function () {
            $scope.deleting_dash = false;
        })
    }
});
