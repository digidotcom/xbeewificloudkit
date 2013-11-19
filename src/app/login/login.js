/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp.login', [
    'XBeeWiFiApp.api',
    'ui.router',
    'ui.route',
    'templates-app'
])
.controller('loginPageCtrl', function ($scope, cloudKitApi, utils) {
    $scope.authenticate = function (username, password, cloud, persistent) {
        return cloudKitApi.login(username, password, cloud, persistent);
    }
    utils.setTitle("Login");
})
.directive('loginForm', function ($log, $state, $stateParams, cloudKitApi) {
    return function (scope, element) {
        scope.username = "";
        scope.password = "";
        if ($state.is("login")) {
            scope.cloud_fqdn = "login.etherios.com";
            scope.is_us = true;
        } else if ($state.is("login_other")) {
            scope.cloud_fqdn = $stateParams.fqdn;
            if (_.isEmpty(scope.cloud_fqdn)) {
                // User navigated to #/login/
                // Redirect to login
                $state.go('login');
                return;
            }
            scope.is_us = false;
        }
        scope.persistent_login = false;
        scope.$form = angular.element(element);

        scope.logging_in = false;

        var clearFormState = function (scope) {
            // First, reset the 'logging_in' state
            scope.logging_in = false;
            // Then, reset form error states.
            var inputs = scope.$form.find("input");
            // Remove focus from form elements.
            $(inputs).blur();
            try {
                $(inputs).tooltip("destroy");
            } catch (e) {
                $log.error(e);
            }
            inputs.parent().removeClass("has-error");
        }

        var form_elements = function (form) {
            var obj = {};

            var f = $(form);
            obj.alertdiv = f.siblings("#login_error");
            obj.username = f.find("#dc_username");
            obj.password = f.find("#dc_password");

            return obj;
        }

        // For unit testing purposes
        scope._clear_form_state = clearFormState;
        scope._form_elements = form_elements;

        scope.login = function () {
            // Check that required elements are present
            if(scope.username === ""){
                scope.form.username.$invalid = true;
            }
            if(scope.password === ""){
                scope.form.password.$invalid = true;
            }
            if(scope.form.$invalid){
                return;
            }

            clearFormState(scope);

            var elements = form_elements(scope.$form);

            var username = scope.username;
            var password = scope.password;
            var cloud = scope.cloud_fqdn;
            var persistent = scope.persistent_login;

            var onSuccess = function () {
                $log.info("Authentication was successful (form)");
                elements.alertdiv.addClass("hide");
                // Check the user's dashboard count. If 0, send to setup
                cloudKitApi.user().then(function (user) {
                    scope.logging_in = false;
                    if(user.dashboard_count === 0){
                        $state.transitionTo("setup");
                    } else {
                        $state.transitionTo("dashboard");
                    }
                }, function (response) {
                    scope.logging_in = false;
                    $log.error("Failed to load user info to check dashboard count", response);
                    // Send the user to dashboard. If they have no dashboards,
                    // they will be redirected to setup anyway.
                    $state.go("dashboard");
                });
            }
            var onError = function (reason) {
                $log.error("Authentication failed. %d %s", reason.status, reason.message);
                scope.logging_in = false;

                if (reason.status === 401) {
                    elements.username.parent().addClass("has-error");
                    elements.password.parent().addClass("has-error");
                    scope.password = "";
                }
                elements.alertdiv.removeClass("hide").text(reason.message);
            }

            scope.logging_in = true;
            scope.authenticate(username, password, cloud, persistent)
                        .then(onSuccess, onError);

            return false;
        }
    };
})
.directive('autofillFix', function () {
    //https://github.com/angular/angular.js/issues/1460#issuecomment-24404240
    return {
        priority: 10,
        link: function ($scope, element) {
            //Extract
            element.on('submit', function () {
                $('input[ng-model]', element).each(function () {
                    if (angular.element(this).attr('type') !== 'checkbox' &&
                            angular.element(this).attr('type') !== 'radio') {
                        angular.element(this).
                            controller('ngModel').$setViewValue($(this).val());
                    }
                });
            });
        }
    }
});
