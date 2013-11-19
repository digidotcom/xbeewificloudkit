#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

'''
Created on Aug 7, 2013

@author: skravik
'''
from rest_framework.authentication import BasicAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.contrib.auth.models import User


class MonitorBasicAuthentication(BasicAuthentication):
    """
    Extension of Basic Auth to check username/password against settings
    instead of normal auth backend. Returns a new User object, which is NOT
    persisted to database.
    """

    def authenticate_credentials(self, userid, password):
        if (userid == settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER and
                password == settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS):
            return (User(username=userid, password=password), None)
        else:
            raise AuthenticationFailed('Invalid username/password')
