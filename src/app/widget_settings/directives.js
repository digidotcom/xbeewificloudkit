/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')

.directive('settingsForm', function () {
    return {
        controller: 'SettingsFormController'
    }
})
.directive('widgetTypeSettingsItem', function ($log, widgetRegistry) {
    return {
        link: function (scope, e, a, controller) {
            var item = controller.new_settings_item({label: "Type"});
            scope.$on('$destroy', function () {
                controller.remove_settings_item(item);
            });
            item.message = "Invalid widget type selection.";
            scope.$watch('selected_type', function (val) {
                $log.debug("New selected type:", val);
                var key = (val || {}).type_key;
                var lookup = widgetRegistry.get(key);
                if (_.isUndefined(key) || _.isUndefined(lookup)) {
                    // Bad widget type selected.
                    scope.has_error = true;
                    item.valid = false;
                }
                else {
                    scope.has_error = false;
                    item.valid = true;
                }
            });
        },
        templateUrl: 'widget_settings/widget-type-settings-item.tpl.html',
        controller: "WidgetTypeController",
        require: '^settingsForm',
        scope: {widget: "=", selected_type: "=ngModel", is_disabled: "@readOnly"},
        replace: true
    }
})
.directive('devicePickerSettingsItem', function () {
    return {
        link: function (scope, e, a, controller) {
            var item = controller.new_settings_item({label: "Device"});
            item.message = "You need to select a device.";
            scope.$on('$destroy', function () {
                controller.remove_settings_item(item);
            });
            scope.$watch('selected_device', function (value) {
                var error = _.isEmpty(value);
                scope.has_error = error;
                //scope.form.$setValidity("device", !error);
                item.valid = !error;
            });
        },
        templateUrl: 'widget_settings/device-picker-settings-item.tpl.html',
        controller: "DevicePickerController",
        require: '^settingsForm',
        scope: {widget: "=", selected_device: "=ngModel", form: "="},
        replace: true
    }
})
.directive('settingsItem', function ($log, utils, $timeout) {
    //jshint -W116
    var whenRendered = function (scope, elem) {
        $log.debug(scope.opt.required, scope.widget[scope.opt.key], elem);
        if (!scope.opt.required) {
            $(elem).find("input.form-control").prop("placeholder", scope.opt['default']);
        }

        if (scope.opt.type === "number") {
            var input = elem.find("input");
            if (scope.opt.minimum != null) {
                input.attr("min", scope.opt.minimum);
            }
            if (scope.opt.maximum != null) {
                input.attr("max", scope.opt.maximum);
            }
        }
    };

    //jshint -W116
    var isEmpty = function (value) {
        return (value == null) || (value === "");
    }

    //jshint -W116
    var okayToBeEmpty = function (value, scope) {
        if (scope.opt.required) {
            return false;
        }
        var _default = scope.opt['default'];
        if (_.isNumber(_default) || _default != null) {
            // Yes, this setting specifies a default value.
            return true;
        }

        return false;
    }

    return {
        link: function postLink(scope, elem, attrs, controller) {
            scope._wideItem = true;
            scope.is_select = false;

            scope._controller_item = controller.new_settings_item(scope.opt);
            scope.$on('$destroy', function () {
                controller.remove_settings_item(scope._controller_item);
            });

            scope.has_error = false;
            scope.will_use_default = false;
            scope.valid_color = function () {
                var widget = scope.widget;
                var opt = scope.opt;
                var value = widget[opt.key];
                if (isEmpty(value) && okayToBeEmpty(value, scope)) {
                    return true;
                }
                var valid = json.validate.formats.color.test(value);
                scope.has_error = !valid;
                scope._controller_item.valid = valid;
                if (!valid) {
                    scope._controller_item.message = "Invalid color.";
                }
                return valid;
            }
            var key = scope.opt.key;
            var validation = utils.options_to_schema([scope.opt]);
            var type = scope.opt.type;
            var prop = validation.properties[key];
            var i;
            if (type === "integer" || type === "number") {
                if (!prop.conform) {
                    prop.conform = function (v) { $log.debug(v); return !isNaN(v); };
                }
            }
            if (type === "boolean") {
                // Special case to handle boolean settings whose default is
                // true.
                if (scope.opt['default'] === true && scope.widget[key] === undefined) {
                    scope.widget[key] = true;
                }
            }
            if (scope.opt.format === "stream") {
                scope.has_hw_config = true;
                scope.is_select = true;
                scope.group_options = true;
                scope.select_values = [];
                for (i = 0; i < 13; i++) {
                    scope.select_values.push({
                        group: "Digital", label: "DIO" + i, value: "DIO/" + i
                    });
                }
                for (i = 0; i < 4; i++) {
                    scope.select_values.push({
                        group: "Analog", label: "ADC" + i, value: "ADC/" + i
                    });
                }
                for (i = 0; i < 1; i++) {
                    scope.select_values.push({
                        group: "Serial", label: "Serial" + i, value: "serial/" + i
                    });
                }
                // Validate stream selection against possible options
                prop['enum'] = _.pluck(scope.select_values, 'value');
            }
            if (scope.opt.format === "pin") {
                scope.has_hw_config = true;
                scope.is_select = true;
                scope.group_options = true;
                scope.select_values = [];
                // DIO# pins
                for (i = 0; i < 13; i++) {
                    scope.select_values.push({
                        group: "Digital (Command)", label: "DIO" + i, value: "DIO/" + i
                    });
                }
                for (i = 0; i < 1; i++) {
                    scope.select_values.push({
                        group: "Serial", label: "Serial" + i, value: "serial/" + i
                    });
                }
                // Validate pin selection against possible options
                prop['enum'] = _.pluck(scope.select_values, 'value');
            }
            if (scope.opt.format === "pwm") {
                scope.has_hw_config = true;
                scope.is_select = true;
                scope.group_options = false;
                scope.select_values = [];
                for (i = 0; i < 2; i++) {
                    scope.select_values.push({
                        label: "M" + i, value: "M" + i
                    });
                }
                // Validate stream selection against possible options
                prop['enum'] = _.pluck(scope.select_values, 'value');
            }
            if (scope.opt.format === "timeout") {
                scope.is_select = true;
                scope.group_options = false;
                scope.select_values = [];
                for (i = 0; i < 10; i++) {
                    scope.select_values.push({
                        label: "T" + i, value: "T" + i
                    });
                }
                for (i = 0; i < 10; i++) {
                    scope.select_values.push({
                        label: "Q" + i, value: "Q" + i
                    });
                }
                // Validate stream selection against possible options
                prop['enum'] = _.pluck(scope.select_values, 'value');
            }

            scope.$watch('widget[opt.key]', function (value) {
                $log.debug("Value changed!", value);
                if (isEmpty(value) && okayToBeEmpty(value, scope)) {
                    // Just let the default shine through.
                    scope.form.$setValidity(scope.opt.key, true);
                    scope.has_error = false;
                    scope._controller_item.valid = true;
                    scope.will_use_default = scope.form.innerForm.opt.$valid;
                    $log.debug("Value is bad, but eh.", scope.opt, value);
                    return;
                }
                // We pass scope.widget into the validation function
                // because most options only look at their own key, but
                // some (e.g. progressbar low/high values) need to look at
                // other ones as well.
                var check = json.validate(scope.widget, validation, {cast: true});
                scope.form.$setValidity(scope.opt.key, check.valid);
                scope.has_error = !check.valid;
                scope.will_use_default = false;
                scope._controller_item.valid = check.valid;
                if (!check.valid) {
                    // Get first error
                    var error = check.errors[0];
                    var item = scope._controller_item;
                    switch (error.attribute) {
                        case "required":
                            item.message = "This field is required.";
                            break;
                        case "enum":
                            // Most likely stream/pin selection
                            item.message = "Invalid selection.";
                            break;
                        // TODO: Add cases for other errors
                        default:
                            item.message = error.message;
                            break;
                    }
                }
            });

            // Use $timeout to run over this settings item's DOM and do
            // extra work after it has been rendered.
            $timeout(_.bind(whenRendered, undefined, scope, elem), 0);

            scope.$on('$destroy', function () {
                scope.form.$setValidity(scope.opt.key, true);
                scope.has_error = false;
            });

            switch (scope.opt.type) {
                case "integer":
                case "number":
                    scope._wideItem = false;
                    break;
            }
            switch (scope.opt.format) {
                case "color":
                case "stream":
                case "pin":
                case "pwm":
                case "timeout":
                    scope._wideItem = false;
                    break;
            }
        },
        templateUrl: 'widget_settings/settings-item.tpl.html',
        scope: {opt: "=", form: "=", widget: "=", base: "@"},
        require: '^settingsForm',
        replace: true
    }
});
