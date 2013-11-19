/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.service('utils', function utils($injector, $log, $timeout, titleService,
                                 widgetRegistry, dashboardService, $q, $parse) {
    // construct a post-link function for a widget
    var postlinkWidget = function (type, scope, element, def, getsCB, setsCB) {
        if (!def) {
            throw new Error("Widget type " + type + " is not defined.");
        }
        var device = scope.widget.device || "__no_device__";
        // Use $injector service to get dataStreams, rather than injecting it
        // directly, so that the dataStreams service (and the WebSocket
        // connection along with it) are only instantiated when widgets are
        // first created on screen.
        var dataStreams = $injector.get('dataStreams');
        var err;
        if (def.has_input) {
            if (!getsCB) {
                err = "Widget type " + type + " receives data updates";
                err += ", but widget " + scope.widget.id + " did not ";
                err += "provide a callback.";
                throw new Error(err);
            }
            var inputStream = scope.widget.gets;
            $log.debug("Listening for stream", device, inputStream);
            var removeInputStreamListener = dataStreams.listen(device, inputStream, getsCB);
            scope.$on('$destroy', function() {
                removeInputStreamListener();
            });
            if (!def.disable_autofetch) {
                dataStreams.get_initial_data(device, inputStream);
            }
        }
        // We also want to register the widget for updates for the
        // streams/pins we write to, so that the widget will stay in sync with
        // the board.
        if (def.sends_output) {
            if (!setsCB) {
                // Check that there is a callback to use.
                if (!getsCB) {
                    err = "Widget type " + type + " receives data updates";
                    err += ", but widget " + scope.widget.id + " did not ";
                    err += "provide any callbacks.";
                    throw new Error(err);
                }
                // Use setsCB instead of getsCB.
                setsCB = getsCB;
            }
            var outputStream = scope.widget.sets;
            $log.debug("Listening for stream", device, outputStream, "(sets)");
            var removeOutputStreamListener = dataStreams.listen(device, outputStream, setsCB);
            scope.$on('$destroy', function() {
                removeOutputStreamListener();
            });
            if (!def.disable_autofetch) {
                dataStreams.get_initial_data(device, outputStream);
            }
        }

        populate_defaults(scope.widget, def);
    };

    var check_type = function (type) {
        return (type in widgetRegistry.getall());
    };

    var base_device_key = {
        key: "device", type: "string", required: true, label: "Device"
    };
    var base_opt_key = {
        key: "id", type: "string", required: true, label: "Widget ID"
    };
    var base_opt_label = {
        key: "label", type: "string", required: true, label: "Label"
    };
    var base_opt_type = {
        key: "type", type: "string", required: true, label: "Type",
        conform: check_type,
        messages: {
            conform: "Invalid widget type: %{actual}"
        }
    };
    var base_transform_type = {
        key: "transform", type: "string", label: "Input Transform",
        required: false,
        messages: {
            conform: "Must be a valid AngularJS expression"
        },
        conform: function (expr) {
            try {
                $parse(expr);
                return true;
            } catch (err) {
                $log.error("Failed to parse transform expression: ", expr, err);
            }
            return false;
        }
    };

    var base_options = [base_device_key, base_opt_key, base_opt_label, base_opt_type];
    var io_options = [
        {key: "gets", type: "string", required: true, label: "Input Stream",
         format: "stream", conform: function (v) { return !!v; }},
        {key: "sets", type: "string", required: true, label: "Output Stream",
         format: "pin", conform: function (v) { return !!v; }},
        base_transform_type
    ];

    var verify_widget = function (widget, definition) {
        var def_options = definition.options || [];
        var additional_options = [];
        if (definition.has_input) {
            // Widget needs to specify the "gets" setting
            additional_options.push(io_options[0]);
        }
        if (definition.sends_output) {
            // Widget needs to specify the "sets" setting
            additional_options.push(io_options[1]);
        }
        if (definition.input_xform) {
            // Widget can take an input transformation
            additional_options.push(base_transform_type);
        }

        var options = base_options.concat(def_options, additional_options);
        var schema;
        if (definition.$schema) {
            schema = definition.$schema;
        } else {
            schema = definition.$schema = options_to_schema(options);
        }

        var check = validate(widget, schema);

        if (!check.valid) {
            // Concatenate error messages together.
            var tpl = "(<%= property %>) <%= message %>";
            var messages = _.map(check.errors, function (error) {
                return _.template(tpl, error);
            });
            var msg = messages.join("; ");
            throw new Error(msg);
        }
    }

    var populate_defaults = function (widget, definition) {
        var def_options = definition.options || [];
        angular.forEach(def_options, function (opt) {
            var has_default = (!opt.required && "default" in opt);
            if (has_default && !(opt.key in widget)) {
                widget[opt.key] = opt["default"];
            }
        });
    }

    var custom_error_messages = {
        required: "Missing required property '%{property}'",
        maxLength: "Too long - max length is %{expected} characters",
        minLength: "Too short - min length is %{expected} characters",
        dependencies: "Missing option dependency: %{expected}"
    };

    // Take a list of widget options, return a Revalidator schema for
    // those widget options.
    var options_to_schema = function (options_list) {
        var schema = {properties: {}};
        _.forEach(options_list, function (option) {
            if (!option.key) {
                var err = "Option does not contain a 'key' property: ";
                throw new Error(err + JSON.stringify(option));
            }
            var key = option.key;
            // Add custom error message if property is not provided in widget
            if (!_.isPlainObject(option.messages)) {
                option.messages = {};
            }
            // Set some default error messages.
            _.defaults(option.messages, custom_error_messages);

            schema.properties[key] = _.omit(option, "key");
        });

        return schema;
    }

    // Simple wrapper around $timeout to reduce widget directive
    // dependencies
    var timeout = function (callback, delay) {
        return $timeout(callback, delay);
    }

    var cancelTimeout = function (promise) {
        return $timeout.cancel(promise);
    }

    // Simple wrapper around Revalidator validation, so that validation all
    // happens through the utils service rather than through json.validate
    // directly. This is especially true if the validation library changes
    // later on.
    var validate = function (object, schema) {
        if (!json || !json.validate) {
            throw new Error("Revalidator was not found.");
        }
        return json.validate(object, schema);
    }

    // Overwrite Revalidator color validation to include jQuery Color

    // Note: this regex is an updated version of the regex built into the
    // Revalidator library, where we've fixed an issue with actually
    // matching only valid colors. (Previously, formatted like
    // ^#[a-z0-9]|...|yellow$, it would accept values like #aaaa and
    // notred.)
    var color_re = /^(?:#[a-f0-9]{6}|#[a-f0-9]{3}|(?:rgb\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*\))|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow)$/i;
    json.validate.formats.color = {
        test: function (value) {
            return color_re.test(value) || value in jQuery.Color.names;
        }
    };

    var get_widget_by_id = function (id) {
        var widgets = dashboardService.widgets();
        var deferred = $q.defer();
        widgets.then(function (list) {
            var match = _.find(list, function (item) {
                return (item.id === id);
            });
            deferred.resolve(match);
        }, function (response) {
            $log.error("Looking up widget by ID (" + id + ") failed:", response);
            deferred.reject(response);
        });
        return deferred.promise;
    }

    //jshint -W016
    //jshint -W116
    // https://raw.github.com/kvz/phpjs/master/functions/url/base64_encode.js
    function base64_decode (data) {
      // http://kevin.vanzonneveld.net
      // +   original by: Tyler Akins (http://rumkin.com)
      // +   improved by: Thunder.m
      // +      input by: Aman Gupta
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   bugfixed by: Onno Marsman
      // +   bugfixed by: Pellentesque Malesuada
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +      input by: Brett Zamir (http://brett-zamir.me)
      // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
      // *     returns 1: 'Kevin van Zonneveld'
      // mozilla has this native
      // - but breaks in 2.0.0.12!
      //if (typeof this.window['atob'] === 'function') {
      //    return atob(data);
      //}
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      data += '';

      do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
          tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
      } while (i < data.length);

      dec = tmp_arr.join('');

      return dec;
    }

    var setTitle = function (title) {
        titleService.setTitle(title);
    };

    //http://stackoverflow.com/a/15643385
    var find_key = function (obj, key) {
        if (_.has(obj, key)) // or just (key in obj)
            return [obj];

        var res = [];
        _.forEach(obj, function(v) {
            if (typeof v == "object" && (v = find_key(v, key)).length)
                res.push.apply(res, v);
        });
        return res;
    }

    return {
        postlinkWidget: postlinkWidget,
        timeout: timeout,
        cancelTimeout: cancelTimeout,
        options_to_schema: options_to_schema,
        validate: validate,
        verify_widget: verify_widget,
        get_widget_by_id: get_widget_by_id,
        base_options: base_options,
        io_options: io_options,
        setTitle: setTitle,
        base64_decode: base64_decode,
        find_key: find_key
    }
});
