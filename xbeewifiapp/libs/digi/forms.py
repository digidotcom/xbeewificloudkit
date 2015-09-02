#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

'''
Created on Jul 29, 2013

@author: skravik
'''
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate
from django.conf import settings


class DeviceCloudAuthenticationForm(AuthenticationForm):
    '''
    classdocs
    '''

    cloud_fqdn = forms.CharField()

    # Override clean to pass additional arg to authenticate
    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')
        cloud_fqdn = self.cleaned_data.get('cloud_fqdn')

        if username and password and cloud_fqdn:
            dc_settings = settings.LIB_DIGI_DEVICECLOUD
            # Our auth backend takes a combined user/cloud id for username
            usercloudid = (username + dc_settings['USERNAME_CLOUD_DELIMETER'] +
                           cloud_fqdn)

            self.user_cache = authenticate(username=usercloudid,
                                           password=password)
            if self.user_cache is None:
                raise forms.ValidationError(
                    self.error_messages['invalid_login'] % {
                        'username': self.username_field.verbose_name
                    })
            elif not self.user_cache.is_active:
                raise forms.ValidationError(self.error_messages['inactive'])
        self.check_for_test_cookie()
        return self.cleaned_data
