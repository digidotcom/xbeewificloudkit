#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

from django.db import models
from django.contrib.auth import get_user_model
from jsonfield import JSONField

# Create your models here.


class Dashboard(models.Model):
    """
    A Model to hold dashboard information and state
    """
    owner = models.ForeignKey(get_user_model(), related_name='dashboards')
    widgets = JSONField(blank=True)
