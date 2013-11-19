/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

"use strict";

module.exports = function(grunt) {
    var prompt = require('prompt');
    var path = require('path');
    var root = path.normalize(__dirname + "/..");

    var prompt_items = [
        {
            name: "type",
            description: "Widget type (e.g. led):",
            required: true
        },
        {
            name: "description",
            description: "Type description (e.g. LED Widget):",
            required: true
        }
    ];

    var taskFunc = function(sys) {
        prompt.message = prompt.delimiter = "";
        prompt.colors = false;
        var done = this.async();
        prompt.start();
        prompt.get(prompt_items, function(err, result) {
            var directiveNameDash = result.type + "-widget";
            var typeKey = result.type;
            if (!sys) {
                directiveNameDash = result.type + "-custom-widget";
                typeKey = result.type + "-custom";
            }
            var dest_base = sys ? "src/app/widgets" : "src/common/widgets";
            var directiveName = grunt.util._.camelize(directiveNameDash);
            var destDir = path.join(root, dest_base, directiveName);
            var description = result.description;

            if (grunt.file.isDir(destDir)) {
                grunt.fatal("Cannot create widget: directory " + destDir + " already exists");
                return done();
            }

            grunt.file.mkdir(destDir);

            var templateFiles = [
                {src: "template.widget.html", dest: ".tpl.html"},
                {src: "template.widget.js_", dest: ".js"},
                {src: "template.widget.spec.js_", dest: ".spec.js"}
            ];

            var directive = directiveName;
            var dest = destDir;

            var templatePath = "widgets/" + directive + "/" + directive + ".tpl.html";

            templateFiles.forEach(function(file) {
                grunt.file.copy(__dirname + '/' + file.src,
                                dest + "/" + directive + file.dest,
                                {
                    process: function (contents, path) {
                        return grunt.template.process(contents, {
                            data: {
                                sys: sys,
                                directive: directive,
                                type: typeKey,
                                templatePath: templatePath,
                                description: description
                            }
                        });
                    }
                });
            });

            console.log("Created new widget definition in " + dest);
            console.log("The widget type key is: " + typeKey);
            console.log("The description of the widget is: " + description);

            return done();
        }
    )};

    grunt.registerTask("widget", "XBee Wi-Fi Cloud Application Kit widget task", function() {
        taskFunc.call(this, false);
    });

    // Task to create a new "built-in" widget.
    grunt.registerTask("syswidget", "XBee Wi-Fi Cloud Application Kit widget task", function() {
        taskFunc.call(this, true);
    });
}
