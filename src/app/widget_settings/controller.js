/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
.controller('WidgetSettingsCtrl', function ($scope, $log, utils, $stateParams, dashboardService,
                                        notificationService, widgetRegistry, $state, $rootScope) {
    //This controller contains the logic for both the
    //widget_settings and /add_widget page

    $scope.widget_id = null;
    $scope.widget = {};

    $scope.settings_items = [];
    $scope.new_settings_item = function (opt) {
        var obj = {
            valid: true,
            error_message: "",
            key: opt.key
        };
        $scope.settings_items.push(obj);
        return obj;
    }

    // Begin: Code for differentiating between widget_settings and add_widget
    if ($state.is('widget_settings')) {
        utils.setTitle("Widget Settings");
        $scope.widget_id = $stateParams.widget_id;
    } else if ($state.is('add_widget')) {
        utils.setTitle("Add Widget");
        dashboardService.widgets().then(function(widgets) {
            var new_widget_id = 'widget_' + new Date().getTime();
            widgets.push({id: new_widget_id});
            $scope.widget_id = new_widget_id;
        }, function (response) {
            // response will consist of a list, where the first item is an
            // error message
            $log.error("Failed to fetch dashboard on add-widget page", response);
            var msg = response[0];
            notificationService.error(msg, 'Problem loading dashboard to add widget');
            $state.go("setup");
        });
    } else {
        $state.transitionTo("dashboard");
    }
    // End: Code for differentiating between widget_settings and add_widget

    $scope.viewCode = function () {
        $state.transitionTo("view_code", {widget_id: $stateParams.widget_id});
    }

    $scope.removing = false;
    $scope.removeWidget = function () {
        $scope.removing = true;
        dashboardService.remove_widget($stateParams.widget_id).then(function () {
            $state.transitionTo("dashboard");
        }, function () {
            $log.error("Error removing widget!", arguments);
        })['finally'](function () {
            $scope.removing = false;
        });
    }

    $scope.selected_type = null;

    $scope.optionFields = [];
    $scope.base_options = utils.base_options;
    $scope.base_options_map = {};
    _.forEach(utils.base_options, function (opt) {
        $scope.base_options_map[opt.key] = opt;
    });
    $scope.io_options_map = {};
    _.forEach(utils.io_options, function (opt) {
        $scope.io_options_map[opt.key] = opt;
    });
    $scope.defn = {};

    $scope.$watch('form.$valid', function (validity, pastvalidity) {
        $log.debug("Validity changed! Now:", validity, "was: ", pastvalidity);
        $rootScope.$broadcast('widget_settings.valid', validity);
    });

    // When this view is instantiated, fetch the widget based on the
    // widget_id variable set above, and set the widget field on the
    // scope to that widget object.
    $scope.$watch('widget_id', function(w_id) {
        if (w_id === null || w_id === undefined) {
            return;
        }

        utils.get_widget_by_id(w_id)
        .then(function (widget) {
            $log.debug("Looked up widget!", widget);
            if (_.isEmpty(widget)) {
                $log.info("There is no widget by that id");
                $state.transitionTo("dashboard");
                return;
            }
            $scope.widget = widget;
            $scope.selected_type = widgetRegistry.get(widget.type);
            $scope.selected_device = widget.device;
        }, function (response) {
            // response will consist of a list, where the first item is an
            // error message
            $log.error("Failed to fetch dashboard on widget settings page", response);
            var msg = response[0];
            notificationService.error(msg, 'Problem loading widget settings');
            $state.go("setup");
        });
    });

    var lookupOptions = function (definition) {
        if (!definition) {
            $log.info("lookupOptions got bad definition!", definition);
        }
        else {
            $log.debug("Widget type selected:", definition);
            _.extend($scope.defn, {
                has_input: definition.has_input,
                sends_output: definition.sends_output,
                input_xform: definition.input_xform
            });

            // definition.options might be falsy (undefined, null,
            // false) -- use [] instead, in that case
            var options = definition.options || [];

            // If options is an empty array, $scope.optionFields will
            // end up being an empty array.
            // Otherwise, it ends up holding the values in options
            $scope.optionFields.splice.apply(
                $scope.optionFields,
                [0, $scope.optionFields.length].concat(options)
            );
        }
    }

    $scope.$watch('selected_type', function (definition) {
        if (definition === null || definition === undefined) {
            return;
        }
        lookupOptions(definition);
        $scope.widget.type = definition.type_key;
    });


    ////////////////
    // Button controlling code
    ////////////////
    $scope.save_disabled = false;
    $scope.saving = false;

    $scope.$on('widget_settings.valid', function (event, valid) {
        $log.debug("Buttons control got new validity", valid);
        $scope.save_disabled = !valid;
    });
    $scope.save = function () {
        $scope.saving = true;
        dashboardService.update_widgets().then(function() {
            $state.transitionTo("dashboard");
        }, function () {
            $log.error("Error saving widget!", arguments);
        })['finally'](function () {
            $scope.saving = false;
        });
    }

    $scope.cancel = function () {
        $state.transitionTo("dashboard");
    }
})
.controller('SettingsFormController', function ($log, $scope) {
    $scope.settings_items = [];
    var new_settings_item = function (opt) {
        var obj = {
            valid: true,
            message: "",
            opt: opt
        };
        $scope.settings_items.push(obj);
        return obj;
    };
    $scope.settings_items_invalid = function () {
        return _.any($scope.settings_items, {valid: false});
    };
    $scope.get_errors = function () {
        return _.where($scope.settings_items, {valid: false});
    }

    $scope.$watch('settings_items_invalid()', function (value) {
        // Enable/disable saving widget depending on input validity.
        $scope.save_disabled = value;
    });

    return {
        new_settings_item: new_settings_item,
        remove_settings_item: function (item) {
            //This code previously used _.pull().
            //It seems that func is not available in the current version
            //of lodash in grunt :(((
            var temp_items = $scope.settings_items.filter(function(i) {
                return (i !== item);
            });
            $scope.settings_items = temp_items;
        }
    };
})
.controller('SettingsItemController', function ($log, $scope) {
    $scope.has_error = false;
})
.controller('WidgetTypeController', function ($log, $scope, widgetRegistry,
                                              $filter) {
    $scope.has_error = false;
    //$scope.selected_type = null;
    $scope.select_values = $filter('nonHiddenWidgets')(widgetRegistry.getall());
})
.controller('DevicePickerController', function ($log, $scope, cloudKitApi, notificationService) {
    $scope.has_error = false;
    $scope.loading_devices = true;

    $scope.devices = [];
    cloudKitApi.devices().then(function (devices) {
        $scope.devices = devices;
    }, function () {
        $log.error("Error loading device list");
        notificationService.error("Reload the page to try again.", "Error loading device list.");
    })['finally'](function () {
        $scope.loading_devices = false;
    });

    $scope.labelify = function (device) {
        var mac = device.devMac;
        var desc = device.dpDescription;
        if (_.isEmpty(desc)) {
            return mac;
        } else {
            return desc + " (" + mac + ")";
        }
    }
})
.controller('PinConfigCtrl', function ($scope, $modal) {
    ////////////////
    // Pin Config Modal
    ////////////////
    $scope.checkPinConfig = function(option) {
        var modalInstance = $modal.open({
            templateUrl: 'widget_settings/pin-config-modal.tpl.html',
            controller: 'settingsPinConfigModalCtrl',
            backdrop: 'static',
            resolve: {
                widget: function(){
                    return $scope.widget;
                },
                option: function(){
                    return option;
                }
            }
        });

        modalInstance.result.then(function() {
            //TODO
        });
    };
})
.controller('settingsPinConfigModalCtrl', function($scope, $modalInstance, cloudKitApi,
                                                    xbeeService, $log, widget, option) {
    $scope.state = {
        working: false,
        applying: false,
        configured: false,
        error: false,
        error_text: null,
        needs_config: false
    }

    $scope.option = option;

    var stream = widget[option.key];

    $scope.command = {options: []};

    // FIXME: refactor this, horribly tight coupling between what should be general widget defined options
    switch(option.format)
    {
    case "stream":
    case "pin":
        var isOutput = !widget.read_only && (option.key === "sets");
        $scope.command = xbeeService.get_stream_options(stream, option.format , isOutput);
        break;
    case "pwm":
        $scope.command = xbeeService.get_stream_options(stream, option.format , true);
        break;
    case "timeout":
        break;
    default:
        //Unknown format, display an error
    }

    if($scope.command.options.length){
        // Autoselect first option
        $scope.selected_value = $scope.command.options[0].value;
    }

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.check_config = function() {
        $scope.state.error = false;
        $scope.state.needs_config = false;
        $scope.state.working = true;

        cloudKitApi.device_config(widget.device, 'InputOutput').then(function(resp) {
            $log.debug("Received device config", resp)
            $scope.state.working = false;
            try {
                //FIXME: Ick
                var value = resp.sci_reply.send_message.device
                    .rci_reply.query_setting.InputOutput[$scope.command.cmd];
                var ic = resp.sci_reply.send_message.device
                    .rci_reply.query_setting.InputOutput.IC;

                $scope.device_value = value;
                $scope.device_ic = ic;

                // Check if the current value is in any of the allowed for that stream
                if(_.find($scope.command.options, {'value': value})){
                    $scope.state.configured = true;
                    // We may still want to expose reconfig options, ex switching digital input low/high
                    if($scope.command.options.length > 1){
                        $scope.state.needs_config = true;
                    }
                } else {
                    $scope.state.needs_config = true;
                }
            } catch (e) {
                $log.error(e);
                $scope.state.error = true;
            }
        }, function (resp) {
            $log.error("Error checking device config", resp);
            $scope.state.working = false;
            $scope.state.error = true;
            $scope.state.error_text = resp.data;
        });
    }

    $scope.configure_device = function (cmd_name, cmd_value, ic_value) {

        $scope.state.applying = true;

        var param = {};
        param[cmd_name] = cmd_value;

        // If ic_value is provided, update and send it too
        if (ic_value !== undefined && xbeeService.cmd_ic_capable(cmd_value)){
            var new_ic = xbeeService.generate_ic_str(cmd_name, ic_value);
            if(new_ic){
                param.IC = new_ic;
                $log.debug("Including updated IC value:", param);
            }
        }

        $log.debug("Configuring device with settings:", param);

        cloudKitApi.device_config_apply(widget.device, 'InputOutput', param).then(function(){
            $log.debug("Successfully applied new setting", cmd_name, cmd_value);
            $scope.state.applying = false
            // Re-run the check fn to confirm
            $scope.check_config();
        }, function(response){
            //TODO What to do in case of error? Currently fails silently
            $log.error("Error while applying setting to new device: ", response);
            $scope.state.error = true;
            $scope.state.error_text = response.data;
            $scope.state.applying = false;
        });
    }

    // Check config immediately when controller created
    $scope.check_config();
});
