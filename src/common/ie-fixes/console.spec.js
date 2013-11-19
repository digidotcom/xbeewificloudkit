/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("IE Fixes -- Console", function () {
    it("should define window._console_bootstrap", function () {
        expect(window._console_bootstrap).toBeDefined();
        expect(typeof window._console_bootstrap).toBe("function")
    });

    it("should have already called window._console_bootstrap", function () {
        // window.console being defined means that either:
        // - it was already defined
        // - we hacked in our own window.console object to make older IE
        // versions (without opening the debugging window) happy
        expect(window.console).toBeDefined();
        expect(window.console.log).toBeDefined();
        expect(typeof window.console.log).toBe("function");
        expect(window.console.error).toBeDefined();
        expect(typeof window.console.error).toBe("function");
    });

    it("should bootstrap window.console properly", function () {
        var _saveconsole = window.console;
        window.console = null;
        window._console_bootstrap();
        expect(window.console).toBeDefined();
        expect(window.console.log).toBeDefined();
        expect(typeof window.console.log).toBe("function");
        expect(window.console.error).toBeDefined();
        expect(typeof window.console.error).toBe("function");
        // For code coverage completeness
        window.console.log();
        window.console.error();
        // Restore original window.console
        window.console = _saveconsole;
    });
});
