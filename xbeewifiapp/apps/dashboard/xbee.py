#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

'''
Collection of helper classes and methods related to the XBee module

Created on Aug 30, 2013

@author: skravik
'''

# Configuration to be applied to for stock Kit experience
# Valid IO values include "Disabled", "ADC", "Input", "low" ,"high", "PWM0"
XBEE_KIT_CONFIG = {
    'Network': {
        # Enable device cloud, send transparent data to cloud as data stream
        'DO': '0x15',
    },
    'InputOutput': {
        # --- Sample Rate ---
        'IR': "5000",  # 5 seconds, in dec
        # --- Change Detect ---
        'IC': ('0x%X') % (1 << 4 | 1 << 8 | 1 << 9 | 1 << 7 | 1 << 6),
        # --- Accelerometer ---
        'D2': "ADC",
        'D3': "ADC",
        # --- Potentiometer ---
        'D1': "ADC",
        # --- Buzzer ---
        'D7': "high",
        'T7': "200",
        'P1': "PWM1",
        # 'M1': "0x0",
        # --- LED gauge ---
        'P0': "PWM0",
        # 'M0': "0x0",
        # --- Vibration Motor ---
        'D6': "high",
        'T6': "200",
        # --- Red LED ---
        'D9': "low",
        # --- Push Button ---
        'D4': "Input",
        # --- Slide Switch ---
        'D8': "Input",
        # --- UART
        'P3': "DOUT",
        'P4': "DIN",
    },
    'Serial': {
        # Use transparent Mode
        'AP': "0"
    },
}

# Map of pin name to AT command used in configuration
XBEE_DIO_AT_MAP = {
    'DIO0': 'D0',
    'DIO1': 'D1',
    'DIO2': 'D2',
    'DIO3': 'D3',
    'DIO4': 'D4',
    'DIO5': 'D5',
    'DIO6': 'D6',
    'DIO7': 'D7',
    'DIO8': 'D8',
    'DIO9': 'D9',
    'DI10': 'P0',
    'DIO11': 'P1',
    'DIO12': 'P2',
    # UART controls
    'DIO13': 'P3',
    'DIO14': 'P4',
    # Only available on surface mount version
    'DIO15': 'P5',
    'DIO16': 'P6',
    'DIO17': 'P7',
    'DIO18': 'P8',
    'DIO19': 'P9',
}


# Dictionary comparison helper from http://stackoverflow.com/a/1165552
class DictDiffer(object):
    """
    Calculate the difference between two dictionaries as:
    (1) items added
    (2) items removed
    (3) keys same in both but changed values
    (4) keys same in both and unchanged values
    """

    def __init__(self, current_dict, past_dict):
        self.current_dict, self.past_dict = current_dict, past_dict
        self.current_keys, self.past_keys = [
            set(d.keys()) for d in (current_dict, past_dict)
        ]
        self.intersect = self.current_keys.intersection(self.past_keys)

    def added(self):
        return self.current_keys - self.intersect

    def removed(self):
        return self.past_keys - self.intersect

    def changed(self):
        return set(o for o in self.intersect
                   if self.past_dict[o] != self.current_dict[o])

    def unchanged(self):
        return set(o for o in self.intersect
                   if self.past_dict[o] == self.current_dict[o])


def compare_config_with_stock(config):
    """
    Compare a config dictionary with default Kit configuration, returning items
    that are missing/modified

    Returns a dictionary with stock values for modified or missing items
    """
    stock = XBEE_KIT_CONFIG
    delta = {}
    for settings_group in stock.iterkeys():
        if settings_group in config:
            # Compare group's items in each
            d = DictDiffer(config[settings_group], stock[settings_group])
            diff = d.changed() | d.removed()
            if len(diff) and not settings_group in delta:
                delta[settings_group] = {}
            for changed in diff:
                delta[settings_group][changed] = stock[settings_group][changed]
        else:
            # Entire group is missing, add it
            delta[settings_group] = stock[settings_group]

    return delta
