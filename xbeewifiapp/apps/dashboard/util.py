#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

'''
Created on Aug 7, 2013

@author: skravik
'''
import logging
import base64
from rest_framework.authentication import get_authorization_header
from rest_framework import HTTP_HEADER_ENCODING
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from Crypto.Cipher import AES

logger = logging.getLogger(__name__)


def get_password_for_session(request):
    """
    Decrypt and return the password stored in a request's associated session

    returns None on failure
    """
    try:
        secret = settings.SECRET_CRYPTO_KEY
    except KeyError:
        raise ImproperlyConfigured('Crypto Key Env Var is missing!')

    try:
        cipher = AES.new(secret, AES.MODE_CFB,
                         request.session.get('encryption_iv'))
        password = cipher.decrypt(request.session.get('password_encrypted'))
    except (TypeError, KeyError):
        logger.error(
            'Attempted to retrieve password for session with missing info')
        return None
    return password


def get_credentials(request):
    """
    Return (username, password, cloud_fqdn) from an authenticated request

    If basic authentication was used, values will be parsed from auth header.
    Else if session authentication was used, will attempt to retrieve from
    session object (decrypting password)
    """
    # Bits from rest_framework's basic auth
    # skipping some validation that should have already been done
    auth = get_authorization_header(request).split()

    if not auth or auth[0].lower() != b'basic' or len(auth) != 2:
        # No authentication header, see if we can pull from session info
        # instead
        try:
            username = request.user.username
            cloud_fqdn = request.user.cloud_fqdn
            password = get_password_for_session(request)
            return username, password, cloud_fqdn
        except (AttributeError, KeyError):
            logger.error('Unable to determine credentials for request')
            return None, None, None

    try:
        auth_parts = base64.b64decode(auth[1]).decode(HTTP_HEADER_ENCODING)\
            .partition(':')
    except (TypeError, UnicodeDecodeError):
        logger.error('Error while parsing request for credentials')
        return None, None, None

    usercloud, password = auth_parts[0], auth_parts[2]

    # Parse the usercloudid, may have been specified together
    parse = usercloud.split(
        settings.LIB_DIGI_DEVICECLOUD['USERNAME_CLOUD_DELIMETER'], 1)
    username = parse[0]
    if len(parse) == 2:
        cloud_fqdn = parse[1]
    else:
        try:
            # Only username provided, use default server if provided
            cloud_fqdn = settings.LIB_DIGI_DEVICECLOUD['DEFAULT_CLOUD_SERVER']
        except KeyError:
            cloud_fqdn = None

    return username, password, cloud_fqdn


def is_key_in_nested_dict(d, key):
    """
    Return bool for existence of key in the dict d or its nested dictionaries
    """
    found = False
    if key in d:
        return True
    for k in d:
        if isinstance(d[k], dict):
            found |= is_key_in_nested_dict(d[k], key)
    return found
