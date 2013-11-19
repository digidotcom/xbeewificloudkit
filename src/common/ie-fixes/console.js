/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

/* Fix for missing console functionality in older versions of Internet Explorer
 *
 * See http://stackoverflow.com/a/7742862 for more information about why this
 * fix is necessary. Essentially, older versions of Internet Explorer do not
 * define window.console until the Developer Tools window is opened. Not having
 * window.console defined causes attempted calls of console.log to "break" the
 * application. This file implements a workaround, where a stubbed version of
 * window.console is defined if it does not exist when the page loads up (i.e.
 * if the application is running in an old IE browser and Developer Tools
 * hasn't been opened).
 */

// Defined as a function so that it can be unit tested.
window._console_bootstrap = function () {
    window.console = window.console || {log: function () {}, error: function () {}};
}
window._console_bootstrap();
