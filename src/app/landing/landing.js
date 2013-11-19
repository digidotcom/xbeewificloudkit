/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.controller('landingCtrl', function ($scope, $state, cloudKitApi) {
    //Simple controller that determines if user is logged in, and if so goes to dashboard
    //Else auth interceptor will redirect to login
    cloudKitApi.user().then(function(){
        $state.go('dashboard');
    });
});