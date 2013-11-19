#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

from django.contrib.auth import get_user_model
from devicecloud import DeviceCloudConnector
from requests.exceptions import HTTPError
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

User = get_user_model()


class DeviceCloudBackend(object):
    """
    Authentication backend for Device Cloud
    """

    def authenticate(self, username=None, password=None):
        """
        Authenticate credentials against Device Cloud

        args:
            username (str): Of the form "username#cloud_fqdn", containing:
                username - Device Cloud Username
                cloud_fqdn - Device Cloud's Fully Qualified Domain Name
                note: If cloud_fqdn is omitted, an optional global default
                    specified in settings.py may be used instead
            password (str): Device Cloud Password
        """

        # Verify all required parameters are present
        if username is None or password is None:
            logger.error('Authenticate called with missing arguments')
            return None

        dc_setting = settings.LIB_DIGI_DEVICECLOUD
        parse = username.split(
            dc_setting['USERNAME_CLOUD_DELIMETER'], 1)
        dc_username = parse[0]
        if len(parse) == 2:
            cloud_fqdn = parse[1]
        else:
            try:
                # Only username provided, use default server if provided
                cloud_fqdn = dc_setting['DEFAULT_CLOUD_SERVER']
            except KeyError:
                logger.error(
                    "Authenticate failed for username %s - No cloud fqdn " +
                    "provided and no default set" % username)
                return None

        conn = DeviceCloudConnector(dc_username, password, cloud_fqdn)
        login_valid = None
        try:
            login_valid, resp = conn.authenticate()
        except HTTPError, e:
            # We got an error trying to hit device cloud, what to do?
            logger.exception(e)
            return None
        if login_valid:
            # Find and use the true device cloud username for this user
            # DC allows mixed case usernames in authentication, which can lead
            # to duplicates users in our app for the same account
            try:
                normalized_username = resp['items'][0]['usrUserName']
            except KeyError:
                # Else just use a lowercase version of provided
                normalized_username = dc_username.lower()

            try:
                user = User.objects.get(username=normalized_username,
                                        cloud_fqdn=cloud_fqdn)
            except User.DoesNotExist:
                # Create a new user, default to an unusable password.
                user = User.objects.create_user(username=normalized_username,
                                                cloud_fqdn=cloud_fqdn)
                user.save()
                logger.info(
                    'Creating new user for username - %s, cloud_fqdn - %s' %
                    (normalized_username, cloud_fqdn))
                pass
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
