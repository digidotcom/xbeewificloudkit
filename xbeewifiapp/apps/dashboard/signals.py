#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

'''
Created on Aug 6, 2013

@author: skravik
'''
import logging
import random
from django.dispatch import Signal, receiver
from django.contrib.auth.signals import user_logged_in
from django.core.exceptions import ImproperlyConfigured
from Crypto.Cipher import AES
from django.conf import settings

logger = logging.getLogger(__name__)


class SignalDict(dict):

    def __init__(self, arglist):
        self.arglist = arglist[:]
        self.constructor = lambda: Signal(providing_args=self.arglist)

    def __getitem__(self, item):
        try:
            return dict.__getitem__(self, item)
        except KeyError:
            # Add a signal for this name
            newsignal = self.constructor()
            self[item] = newsignal
            return newsignal


# Mapping of monitor topics to SignalDict's for that topic
# Note that each topic's dict might be constructed differently -
# ex. DataPoint uses device_id and data args
MONITOR_TOPIC_SIGNAL_MAP = {
    'DataPoint': SignalDict(['device_id', 'data']),
    'DeviceCore': SignalDict(['device_id', 'data'])
}


# When an user logs in, store their password encrypted
# in the session for later use
@receiver(user_logged_in)
def store_password(sender, user, request, **kwargs):
    # If we're passed a rest framework request, try to pull data from .DATA
    try:
        if hasattr(request, 'DATA'):
            password = request.DATA['password']
        else:
            password = request.POST['password']
    except KeyError:
        logger.warning('Received login signal, but request had no password!')
        return

    # Save credentials (w/ encrypted pass) in request session for use later
    try:
        secret = settings.SECRET_CRYPTO_KEY
    except KeyError:
        raise ImproperlyConfigured('Crypto Key Env Var is missing!')

    init_vector = ''.join(
        chr(random.randint(0, 0xFF)) for n in range(AES.block_size))
    cipher = AES.new(secret, AES.MODE_CFB, init_vector)

    request.session['password_encrypted'] = cipher.encrypt(password)
    request.session['encryption_iv'] = init_vector
