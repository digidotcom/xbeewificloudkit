/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('widgetRegistry', function widgetRegistry() {
        // AngularJS will instantiate a singleton by calling "new" on this function
        var registry = {};

        return {
            // Add a widget definition to the registry.
            put: function(type_key, definition) {
                if (_(registry).has(type_key)) {
                    // This type key is already registered.
                    throw new Error("Type key '"+ type_key +"' is already registered.");
                }

                registry[type_key] = definition;
                // Tack this on so we can retrieve it later.
                definition.type_key = type_key;
            },
            // Look up a widget definition from the registry.
            get: function(type_key) {
                return registry[type_key];
            },
            getall: function() {
                return registry;
            },
            // useful in unit testing. don't call otherwise, please.
            clear: function() {
                for (var key in registry) {
                    delete registry[key];
                }
            }
        };
    });
