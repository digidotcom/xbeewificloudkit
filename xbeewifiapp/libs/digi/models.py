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

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone


class DeviceCloudUserManager(BaseUserManager):

    def _create_user(self, username, cloud_fqdn, email, password,
                     is_staff, is_superuser, **extra_fields):
        """
        Creates and saves a User with the given username, email and password.
        """
        now = timezone.now()
        if not username or not cloud_fqdn:
            raise ValueError('The given username and cloud fqdn must be set')
        # Create the unique user+cloud string id
        user_cloud_id = username + '#' + cloud_fqdn

        user = self.model(user_cloud_id=user_cloud_id, username=username,
                          cloud_fqdn=cloud_fqdn, last_login=now,
                          **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, cloud_fqdn, **extra_fields):
        return self._create_user(username, cloud_fqdn, None, None, False,
                                 False, **extra_fields)

    def create_superuser(self, username, cloud_fqdn, **extra_fields):
        return self._create_user(username, cloud_fqdn, None, None, True, True,
                                 **extra_fields)


class DeviceCloudUser(AbstractBaseUser):
    '''
    Simple extension of Django User model to handle username/server
    combinations
    '''
    user_cloud_id = models.CharField(max_length=254, unique=True)
    username = models.CharField(max_length=64, blank=False)
    cloud_fqdn = models.URLField(blank=False)

    objects = DeviceCloudUserManager()
    USERNAME_FIELD = 'user_cloud_id'
    REQUIRED_FIELDS = ['username', 'cloud_fqdn']

    # Some forms
    def get_username(self):
        "Return the identifying username for this User"
        return self.username

    def is_active(self):
        return True

    def get_full_name(self):
        return self.user_cloud_id

    def get_short_name(self):
        return self.username

    class Meta:
        unique_together = (('username', 'cloud_fqdn'),)
