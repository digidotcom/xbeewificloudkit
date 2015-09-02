/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module("XBeeWiFiApp.api")
.service('viewCodeApi', function ($http, $q, $log) {
    var getCode = function(widgetName, extension, builtin) {
        var deferred = $q.defer();
        if (!(_.contains(['js', 'css', 'less', 'tpl.html'], extension))) {
            var reason = {}
            reason.message = 'unsupported filetype for viewing code of ' + widgetName;
            deferred.reject(reason);
            return deferred.promise;
        }
        var filePath = "src/" + (builtin ? "app/" : "common/");
        filePath += "widgets/" + widgetName + '/' + widgetName + '.' + extension;
        var fileURI = "/static/" + filePath;
        $log.info('GETting file from ' + fileURI);
        $http.get(fileURI)
            .success(function(response) {
                deferred.resolve({source: response, path: filePath});
            })
            .error(function(_, status) {
                deferred.reject({'status': status});
            });
        return deferred.promise;
    }

    return {
        getCode: getCode
    }
});
