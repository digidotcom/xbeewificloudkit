/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: widgetRegistry", function() {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var registry;
    beforeEach(inject(function (widgetRegistry) {
        registry = widgetRegistry;
    }));

    beforeEach(function() {
        // Empty the registry, so we have a clean slate.
        registry.clear();
    });

    it('should start with nothing registered', function() {
        var registered = registry.getall();
        expect(_.keys(registered).length).toBe(0);
    });

    it('should register widget definitions correctly', function() {
        var key1 = "typeone";
        var def1 = {
            size: [2, 2],
            directive: "test-widget",
            directive_c: "testWidget",
            has_input: true,
            sends_output: false,
            options: []
        };

        registry.put(key1, def1);

        // we would expect only one widget type to be registered currently
        var all = registry.getall();
        expect(all).toBeDefined();
        expect(_.keys(all)).toEqual([key1]);

        // check that lookup works
        var found = registry.get(key1);
        expect(found).toBe(def1);
    });

    it('should throw an error on duplicate key', function() {
        var key = "test";
        // put a widget definition in there initially
        registry.put(key, {});

        expect(function() { registry.put(key, {}); }).toThrow();
    });
});

