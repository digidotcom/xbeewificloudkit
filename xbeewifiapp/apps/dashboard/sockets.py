#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

import logging

from signals import MONITOR_TOPIC_SIGNAL_MAP
from socketio.namespace import BaseNamespace
from socketio.sdjango import namespace
from views import DevicesList, monitor_setup, monitor_devicecore_setup

logger = logging.getLogger(__name__)


@namespace('/device')
class DeviceDataNamespace(BaseNamespace):

    def get_initial_acl(self):
        """ Don't allow any methods until authenticated """
        return []

    def initialize(self):
        """
        Initialize the namespace for this socket connection. Checks that the
        request comes from a valid session
        """
        # Create a new set to track monitored devices
        self.monitored_devices = set()
        if not self.request.user.is_authenticated():
            logger.error(
                "Attempted to initialize unauthenticated socket connection")
            self.emit(
                'error',
                "Attempted an unauthenticated socket connection. Do you " +
                "have a valid session?")
            return
        else:
            # Lift access control restrictions
            self.lift_acl_restrictions()

    def on_startmonitoringdevice(self, *args):
        for device_id in args:
            if device_id is not None and device_id not in \
                    self.monitored_devices:
                # Check that the requested device belongs to this user
                # If the local list of devices doesn't yet exist, do a device
                # query.
                if not self.request.session.get('user_devices', False):
                    DevicesList.as_view()(self.request)
                if device_id in self.request.session.get('user_devices', []):
                    logger.debug("Kicking/Creating DataPoint Monitor for %s" %
                                 device_id)
                    mon = monitor_setup(self.request, device_id)
                    if mon.status_code != 200:
                        # Something went wrong with monitor setup,
                        # return an error
                        logger.error(
                            'Error while trying to set up monitor for socket')
                        self.emit(
                            'error',
                            "An error occurred while setting up the monitor " +
                            "for this device.", mon.data)
                    else:
                        logger.debug(
                            "Adding socket reciever for data for device %s" %
                            device_id)
                        # Add receiver for DataPoint events
                        MONITOR_TOPIC_SIGNAL_MAP['DataPoint'][device_id]\
                            .connect(self.device_data_receiver)
                        # Add receiver for DeviceCore events
                        MONITOR_TOPIC_SIGNAL_MAP['DeviceCore'][device_id]\
                            .connect(self.device_status_receiver)
                        self.monitored_devices.add(device_id)
                        self.emit('started_monitoring', device_id)
                else:
                    logger.error(
                        "User %s attempted to start monitoring device %s," +
                        " which is not in their account!" %
                        (self.request.user.username, device_id))
                    self.emit(
                        'error',
                        "Permission denied: Attempted to monitor a device " +
                        "not in your account!")
        return True

    def on_stopmonitoringdevice(self, *args):
        for device_id in args:
            if device_id in self.monitored_devices:
                logger.debug("Removing socket reciever for data for device %s"
                             % device_id)
                MONITOR_TOPIC_SIGNAL_MAP['DataPoint'][device_id]\
                    .disconnect(self.device_data_receiver)
                MONITOR_TOPIC_SIGNAL_MAP['DeviceCore'][device_id]\
                    .disconnect(self.device_status_receiver)
                self.monitored_devices.remove(device_id)
                self.emit('stopped_monitoring', device_id)
        return True

    def on_startmonitoringstatus(self, *args):
        """
        Check for the existence of a DeviceCore monitor for this user
        """
        mon = monitor_devicecore_setup(self.request)
        if mon.status_code != 200:
            # Something went wrong with monitor setup, return an error
            logger.error('Error while trying to set up monitor for socket')
            self.emit('error',
                      "An error occurred while setting up the monitor for " +
                      "this device.",
                      mon.data)
        return True

    def disconnect(self, **kwargs):
        logger.debug("disconnecting socket & signal recievers")
        for device_id in self.monitored_devices:
            MONITOR_TOPIC_SIGNAL_MAP['DataPoint'][device_id]\
                .disconnect(self.device_data_receiver)
            MONITOR_TOPIC_SIGNAL_MAP['DeviceCore'][device_id]\
                .disconnect(self.device_status_receiver)
        self.monitored_devices.clear()
        super(DeviceDataNamespace, self).disconnect(**kwargs)

    def device_data_receiver(self, **kwargs):
        # Validate that we're only sending data this socket is supposed to
        # monitor
        if kwargs['device_id'] in self.monitored_devices:
            self.emit('device_data', kwargs['data'])
        return True

    def device_status_receiver(self, **kwargs):
        # Validate that we're only sending data this socket is supposed to
        # monitor
        if kwargs['device_id'] in self.monitored_devices:
            self.emit('device_status', kwargs['data'])
        return True
