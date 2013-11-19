/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('xbeeService', function xbeeService() {
        /*
        Utility Service that contains mappings for various XBee specific
        settings and config commands
        */

        var stream_atcmd_map = {}
        // Then autogenerate as much as we can
        // DIO[0-19] maps to D[0-9] and P[0-9]
        for (var i = 0; i <= 19; i++) {
            stream_atcmd_map["DIO/" + i] = (i<10) ? "D" + i : "P" + (i-10);
        }
        // ADC[0-3] maps to D[0-3]
        for (var j = 0; j <= 3; j++) {
            stream_atcmd_map["ADC/" + j] = "D" + j;
        }
        // PWM[0-1] maps to P[0-1], likewise for widgets using M*
        for (var k = 0; k <= 1; k++) {
            stream_atcmd_map["PWM/" + k] = "P" + k;
            stream_atcmd_map["M" + k] = "P" + k;
        }

        var get_stream_options = function (stream, type, isOutput){
            var resp = {
                cmd: stream_atcmd_map[stream],
                options: []
            }

            // Handle one-off serial case
            if (stream.substring(0, 6) === "serial") {
                if (isOutput) {
                    resp.cmd = "P3";
                    resp.options.push({value: "DOUT", label: "Serial Output"})
                } else {
                    resp.cmd = "P4";
                    resp.options.push({value: "DIN", label: "Serial Input"})
                }
                return resp;
            }


            switch (type) {
            case "pwm":
                // P[0-1] takes value PWM[0-1]
                resp.options.push({value: "PWM" + stream.charAt(stream.length-1), label: "PWM Output"});
                break;
            default:
                if(isOutput){
                    resp.options.push({value: "low", label: "Digital Output - Low"});
                    resp.options.push({value: "high", label: "Digital Output - High"});
                } else {
                    // If this is an analog input, return separate option
                    if(stream.substring(0, 3) === "ADC"){
                        resp.options.push({value: "ADC", label: "Analog Input"});
                    } else {
                        resp.options.push({value: "Input", label: "Digital Input"});
                    }
                }
            }

            return resp;
        };

        var cmd_ic_capable = function (cmd_value){
            //IC used on xbee pins set as digital inputs ("Input"), or digital outputs ("high", "low")
            if ((cmd_value === "Input") || (cmd_value === "high") || (cmd_value === "low")){
                return true;
            } else {
                return false;
            }
        }

        var generate_ic_str = function (cmd, old_ic){
            //Parse cmd to determine mask bit for pin
            var re = /^([DP]{1})(\d{1})$/;
            var parsed = cmd.match(re);
            if (!parsed){
                return null;
            }

            var bit = parseInt(parsed[2], 10) + ((parsed[1] === "P") ? 10 : 0);
            var new_ic = parseInt(old_ic) | (1 << bit);

            return "0x" + new_ic.toString(16);
        }

        return {
            get_stream_options: get_stream_options,
            cmd_ic_capable: cmd_ic_capable,
            generate_ic_str: generate_ic_str
        };
    });