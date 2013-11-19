/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('notificationService', function notificationService() {
        var success = function (text, title, optionsOverride) {
            return toastr.success(text, title, optionsOverride);
        }

        var info = function (text, title, optionsOverride) {
            return toastr.info(text, title, optionsOverride);
        }

        var warning = function (text, title, optionsOverride) {
            return toastr.warning(text, title, optionsOverride);
        }

        var error = function (text, title, optionsOverride) {
            return toastr.error(text, title, optionsOverride);
        }

        var cancel = function (toast) {
            toastr.clear(toast);
        }

        return {
            success: success,
            info: info,
            warning: warning,
            error: error,
            cancel: cancel
        }
    });
