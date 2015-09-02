#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

'''
Created on Jul 30, 2013

@author: skravik
'''

from django.contrib.auth import get_user_model
from rest_framework import serializers
from xbeewifiapp.apps.dashboard.models import Dashboard


class DashboardSerializer(serializers.HyperlinkedModelSerializer):
    '''
    Serializer for Dashboard objects
    '''
    # Uncomment to expose owner field
    # owner = serializers.Field(source='owner.username')

    class Meta:
        model = Dashboard
        fields = ('url',
                  'widgets',
                  # 'owner',
                  )


class UserSerializer(serializers.HyperlinkedModelSerializer):
    dashboard_count = serializers.SerializerMethodField('get_dashboard_count')

    class Meta:
        model = get_user_model()
        fields = ('url', 'username', 'cloud_fqdn', 'dashboard_count')

    def get_dashboard_count(self, obj):
        return Dashboard.objects.filter(owner=obj).count()
