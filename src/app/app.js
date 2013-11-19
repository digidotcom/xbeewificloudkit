/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

angular.module( 'XBeeWiFiApp', [
  'XBeeWiFiApp.login',
  'XBeeWiFiApp.devices',
  'XBeeWiFiApp.setup',
  'XBeeWiFiApp.api',
  'templates-app',
  'templates-common',
  'ui.router',
  'ui.route',
  'titleService',
  'ui.bootstrap',
  'ui.keypress',
  'ui.mask'
])

.config( function myAppConfig ( $stateProvider, $urlRouterProvider, $httpProvider, $provide ) {
    $urlRouterProvider.otherwise('/');
    $stateProvider
    .state('landing', {
        url: '/',
        views: {
            page: {
                controller: "landingCtrl"
            }
        }
    })
    .state('login', {
        url: '/login',
        views: {
            navbar: {
                templateUrl: "templates/navbar-login.tpl.html"
            },
            page: {
                templateUrl: "login/login-page.tpl.html",
                controller: "loginPageCtrl"
            },
            footer_buttons: {template: ""}
        }
    })
    .state('login_other', {
        url: '/login/:fqdn',
        views: {
            navbar: {
                templateUrl: "templates/navbar-login.tpl.html"
            },
            page: {
                templateUrl: "login/login-page.tpl.html",
                controller: "loginPageCtrl"
            },
            footer_buttons: {template: ""}
        }
    })
    .state('setup', {
        url: '/setup',
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "setup/setup-page.tpl.html",
                controller: "setupPageCtrl"
            },
            footer_buttons: {template: ""}
        }
    })
    .state('devices', {
        url: '/devices',
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "devices/devices-page.tpl.html",
                controller: "devicesPageCtrl"
            },
            footer_buttons: {
                templateUrl: "devices/footer-buttons_devices.tpl.html"
            }
        }
    })
    .state('dashboard', {
        url: '/dashboard',
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "dashboard/main.tpl.html",
                controller: "DashboardPageController"
            },
            footer_buttons: {
                templateUrl: "templates/footer-buttons_dashboard.tpl.html",
                controller: "DashboardFooterCtrl"
            }
        }
    })
    .state('view_code', {
        url: "/view_code/{widget_id}",
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "view_code/page_view.tpl.html",
                controller: "ViewCodeCtrl"
            },
            footer_buttons: {
                templateUrl: "templates/null-template.tpl.html",
                controller: ""
            }
        }
    })
    .state('widget_settings', {
        url: "/widget_settings/{widget_id}",
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "widget_settings/page_view.tpl.html",
                controller: "WidgetSettingsCtrl"
            },
            footer_buttons: {
                templateUrl: "templates/null-template.tpl.html",
                controller: ""
            }
        }
    })
    .state('add_widget', {
        url: "/add_widget",
        views: {
            navbar: {
                templateUrl: "templates/navbar-logged-in.tpl.html",
                controller: "NavbarController"
            },
            page: {
                templateUrl: "widget_settings/page_view_add.tpl.html",
                controller: "WidgetSettingsCtrl"
            },
            footer_buttons: {
                templateUrl: "templates/null-template.tpl.html",
                controller: ""
            }
        }
    });

    $provide.factory('handle429', ['$q', '$log', '$injector', function ($q, $log, $injector) {
        var handle429s = function handle429s(response) {
            var $timeout = $injector.get('$timeout');
            var $http = $injector.get('$http');

            var deferred = $q.defer();
            var config = response.config;
            var retries = config._retries || 0;
            if (retries >= 5) {
                // Oh no!
                $log.error("Stopping retry of request because of 429s.", config);
                deferred.reject(response);
            } else {
                config._retries = ++retries;
                $timeout(function () {
                    $log.info("Replaying request (#" + retries + ")", config);
                    $http(config).then(function (response) {
                        deferred.resolve(response);
                    }, function (response) {
                        deferred.reject(response);
                    });
                }, 1000 * config._retries);
            }

            return deferred.promise;
        };

        return handle429s;
    }]);

    $provide.factory('errorInterceptor', ['$q', '$log', '$rootScope', '$injector', 'handle429',
                        function interceptor($q, $log, $rootScope, $injector, handle429) {
        function success(response) {
            return response;
        }

        function error(response) {
            var stat = response.status;
            $log.info("Response status: ", stat, ". ", response);
            if (response.status === 403) {
                $log.info("Redirecting to login!");
                $rootScope.$state.go("login");
            } else if (response.status === 429) {
                return handle429(response);
            }
            return $q.reject(response);
        }

        return function(promise) {
            return promise.then(success, error);
        }
    }]);

    $httpProvider.responseInterceptors.push('errorInterceptor');
})
.controller('NavbarController', function ($scope, cloudKitApi) {
    $scope.username = "";
    $scope.cloud_fqdn = "https://login.etherios.com";
    cloudKitApi.user().then(function (user) {
        if (user ===  null || user === undefined) {
            $scope.username = "<unknown>";
            return;
        }
        $scope.username = user.username;
        $scope.cloud_fqdn = "https://" + user.cloud_fqdn;
    })
})
.constant("RepoUrlBase", "https://github.com/digidotcom/xbeewificloudkit/blob/master")
.value('uiMaskConfig', {
    'maskDefinitions': {
        '9': /\d/,
        'A': /[a-zA-Z]/,
        '*': /[a-zA-Z0-9]/,
        'X': /[a-fA-F0-9]/
    }
})
.run( function run ($rootScope, $state, $stateParams, titleService ) {
    titleService.setSuffix( ' | XBee Wi-Fi Cloud Kit' );
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
});
