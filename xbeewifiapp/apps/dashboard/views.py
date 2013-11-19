#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

import logging
from django.shortcuts import render_to_response
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.contrib.auth import login, logout, authenticate
from rest_framework.decorators import api_view, authentication_classes,\
    permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework import viewsets
from rest_framework import permissions
from rest_framework import status
from models import Dashboard
from serializers import DashboardSerializer, UserSerializer
from permissions import IsOwner
from authentication import MonitorBasicAuthentication
from django.conf import settings
from signals import MONITOR_TOPIC_SIGNAL_MAP
from util import get_credentials, is_key_in_nested_dict
from xbeewifiapp.libs.digi.devicecloud import DeviceCloudConnector
from requests.exceptions import HTTPError, ConnectionError
import re
from datetime import datetime, timedelta
from urllib import unquote
from distutils.util import strtobool
import base64
from xbee import compare_config_with_stock

logger = logging.getLogger(__name__)


# Ensure the csrf cookie is set here, client may do posts via ajax on pages
# with no templated form
@ensure_csrf_cookie
def placeholder(request):
    return render_to_response('placeholder.html')


def socket_test(request):
    return render_to_response('sockettest.html',
                              {'request': request, 'user': request.user})


# API-Related Views

@csrf_exempt
@api_view(['PUT'])
@authentication_classes((MonitorBasicAuthentication,))
@permission_classes(())
def monitor_receiver(request):
    """
    Push Monitor endpoint - Recieves data from Device Cloud
    """
    # Because we have no permission class, any authenticated user can access
    # this view.
    # Further restrict only to the device cloud user specified in settings
    # Note that this User object is a one-off, where we set the credentials
    # directly in special basic auth class and is not persisted to the db
    secret_user = settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER
    secret_pass = settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS
    if (request.user.username != secret_user
            or request.user.password != secret_pass):
        return Response(status=status.HTTP_403_FORBIDDEN)

    logger.info('Recieved Device Cloud Push')

    # Iterate through payload, sending messages keyed off topic
    try:
        messages = request.DATA['Document']['Msg']
    except KeyError:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    # Msg may be a list or object, depending on if multiple events.
    # Handle single case by making list of len 1
    if type(messages) is not list:
        messages = [messages]

    monitor_has_listeners = False
    for msg in messages:
        try:
            topic_full = msg['topic']
        except KeyError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # reported topics come in a /##/Topic/Sub/topic/...,
        # grab parts we care about
        (topic, subtopic) = topic_full.split('/', 2)[1:]
        subtopic = unquote(subtopic)

        try:
            signal_map = MONITOR_TOPIC_SIGNAL_MAP[topic]
        except KeyError:
            logger.warning(
                'No signal map exists for monitor topic %s!' % topic)

        # Each topic may be handled differently. For example, datapoint signals
        # are keyed off device id
        signal = None
        args = {}

        if topic == 'DataPoint':
            # Attempt to extract a device_id from the subtopic
            reg_pattern = "\S*(?P<dev_id>((-?([0-9A-F]{8})){4}))"
            match = re.match(reg_pattern, subtopic)
            if match:
                device_id = match.groupdict()['dev_id']
                signal = signal_map[device_id]
                args['device_id'] = device_id
                args['data'] = msg
            else:
                logger.warning(
                    'Error - No deviceId found in DataPoint subtopic!')
        elif topic == 'DeviceCore':
            # Device id not in topic, need to parse out from
            # message body directly...
            try:
                device_id = msg['DeviceCore']['devConnectwareId']
                signal = signal_map[device_id]
                args['device_id'] = device_id
                args['data'] = msg
            except KeyError:
                logger.warning('No DeviceId found in DeviceCore event')
        else:
            logger.warning('No handler for push topic type %s!' % topic)

        # If we have no receivers, monitor should be marked inactive
        # As of 2.10, Device Cloud will retry up to 16 min apart over 24 hours,
        # then flag
        if signal is not None and len(signal.receivers):
            monitor_has_listeners = True
            logger.debug(
                "%d registered receivers found for this push, sending signal"
                % len(signal.receivers))
            signal.send_robust(sender=None, **args)

    if monitor_has_listeners:
        logger.info('Push event with receivers handled')
        return Response()
    else:
        # TODO what status code to return? DC will use anything > 3xx
        logger.info("Received a push with no receivers, responding with 503 " +
                    "to make monitor inactive")
        return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)


# *************

@api_view(['GET'])
def monitor_setup(request, device_id):
    """
    View to handle monitor setup for a device

    Will query for existing monitors, create a new one if none found, else
    kickstart existing monitor.

    Returns the monitor information from Device Cloud
    ------------------------------------------
    """
    username, password, cloud_fqdn = get_credentials(request)

    if not username or not password or not cloud_fqdn:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    conn = DeviceCloudConnector(username, password, cloud_fqdn)

    endpoint_url = reverse(monitor_receiver, request=request)
    # Device cloud won't allow monitors pointing to localhost, etc,
    # so don't even try
    if 'localhost' in endpoint_url or '127.0.0.1' in endpoint_url:
        logger.error('Rejecting attempt to create monitor to ' + endpoint_url)
        return Response(status=status.HTTP_400_BAD_REQUEST)

    try:
        monitors = conn.get_datapoint_monitor_for_device(device_id,
                                                         endpoint_url)

        if monitors['resultSize'] == "0":
            # No existing monitors found for this device on this account,
            # create a new one
            # NOTE: The full url is generated by information passed in the
            # request. If the same backend is being routed to from multiple
            # places (reverse proxies, etc), each will generate a different url
            logger.info('Creating a new DataPoint monitor for device %s'
                        % device_id)
            resp = conn.create_datapoint_monitor(
                device_id,
                endpoint_url,
                settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER,
                settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS,
                description="XBee Wi-Fi Cloud Kit Monitor")
        else:
            # Should only have one monitor for a given device/topic
            if len(monitors['items']) > 1:
                logger.warning("Found multiple monitors for this device! " +
                               "This should not happen!")

            monitor = monitors['items'][0]
            logger.info(
                'Found an existing DataPoint monitor for %s, kicking it'
                % device_id)
            conn.kick_monitor(monitor['monId'])
            # Return the original info
            resp = monitors

    except HTTPError, e:
        return Response(status=e.response.status_code, data=e.response.text)
    except ConnectionError, e:
        return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(data=resp)


@api_view(['GET'])
def monitor_devicecore_setup(request):
    """
    View to handle DeviceCore monitor setup for an user

    Will query for existing monitors, create a new one if none found, else
    kickstart existing monitor.

    Returns the monitor information from Device Cloud
    ------------------------------------------
    """
    username, password, cloud_fqdn = get_credentials(request)

    if not username or not password or not cloud_fqdn:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    conn = DeviceCloudConnector(username, password, cloud_fqdn)

    endpoint_url = reverse(monitor_receiver, request=request)
    # Device cloud won't allow monitors pointing to localhost, etc,
    # so don't even try
    if 'localhost' in endpoint_url or '127.0.0.1' in endpoint_url:
        logger.error('Rejecting attempt to create monitor to ' + endpoint_url)
        return Response(status=status.HTTP_400_BAD_REQUEST)

    try:
        monitors = conn.get_devicecore_monitor(endpoint_url)

        if monitors['resultSize'] == "0":
            # No existing monitors found for this device on this account,
            # create a new one
            # NOTE: The full url is generated by information passed in the
            # request. If the same backend is being routed to from multiple
            # places (reverse proxies, etc), each will generate a different
            # url.
            logger.info('Creating a new DeviceCore monitor for user %s'
                        % username)
            resp = conn.create_devicecore_monitor(
                endpoint_url,
                settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER,
                settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS,
                description="XBee Wi-Fi Cloud Kit Monitor")
        else:
            # Should only have one monitor for a given device/topic
            if len(monitors['items']) > 1:
                logger.warning("Found multiple monitors for user %s! " +
                               "This should not happen!" % username)

            monitor = monitors['items'][0]
            logger.info(
                'Found an existing DeviceCore monitor for user, kicking it')
            conn.kick_monitor(monitor['monId'])
            # Return the original info
            resp = monitors

    except HTTPError, e:
        return Response(status=e.response.status_code, data=e.response.text)
    except ConnectionError, e:
        return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(data=resp)


@api_view(['GET'])
@permission_classes(())
def api_root(request, format=None):
    """
    Welcome to the XBee Wi-Fi Cloud Kit API Explorer
    ------------------------------------------------

    From here, you can browse and interact with API resources right in your
    browser, using the same calls made by the frontend. Unauthenticated users
    will have limited visibility into the system, users can log in via the
    login API or via the link in the header.

    From the API root, you will find links for the following resources:

    * `login/logout` - Used for establishing session based authentication
    * `user` - View the user resource associated with your account
    * `devices` - Explore device information for status, data, and
                        configuration
    * `dashboards` - Explore the dashboard resource rendered by the frontend

    """
    return Response({
        'login': reverse('api_login', request=request, format=format),
        'logout': reverse('api_logout', request=request, format=format),
        'user': reverse('deviceclouduser-list',
                        request=request, format=format),
        'dashboards': reverse('dashboard-list', request=request,
                              format=format),
        'devices': reverse('devices-list', request=request, format=format),
    })


@ensure_csrf_cookie
@api_view(['POST'])
@authentication_classes(())
@permission_classes(())
def login_user(request):
    """
    View to log user into the app for session-based auth
    ------------------------------------------

    *POST* - form encoded data or json containing the following required
                fields:

    * `username` - device cloud username
    * `password` - device cloud password
    * `cloud_fqdn` - cloud server fully qualified domain name (ex
                        _login.etherios.com_)

    The following fields are optional:

    * `persistent_session` - boolean value, default False. Specifies whether
                            session is remembered, or should expire when
                            browser is closed.

    """
    try:
        username = request.DATA['username']
        password = request.DATA['password']
    except KeyError:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    # Check that values are non-empty
    if not username or not password:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    try:
        cloud_fqdn = request.DATA['cloud_fqdn']
    except KeyError:
        if 'DEFAULT_CLOUD_SERVER' in settings.LIB_DIGI_DEVICECLOUD:
            cloud_fqdn = settings.LIB_DIGI_DEVICECLOUD['DEFAULT_CLOUD_SERVER']
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    # generate combo username/cloud expected by auth
    usercloudid = username + \
        settings.LIB_DIGI_DEVICECLOUD['USERNAME_CLOUD_DELIMETER'] + cloud_fqdn
    if username and password and cloud_fqdn:
        user = authenticate(username=usercloudid,
                            password=password)
        if user is not None:
            login(request, user)

            # If specified, set the session cookie to expire when user's Web
            # Browser is closed
            persist_session = request.DATA.get('persistent_session', None)
            if (type(persist_session) is str or
                    type(persist_session) is unicode):
                persist_session = strtobool(persist_session)

            if not persist_session:
                request.session.set_expiry(0)

            return Response()
        else:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    else:
        return Response(status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes(())
@permission_classes(())
def logout_user(request):
    """
    View to log user out of the app, clearing any session data
    ------------------------------------------
    """
    logout(request)
    return Response()


class DashboardsViewSet(viewsets.ModelViewSet):
    """
    This endpoint presents Dashboard resources
    ------------------------------------------

    The `widgets` field contains a json object defining dashboard state.

    _Authentication Required_ - Authenticated user will have access only to
    Dashboards they own
    """
    serializer_class = DashboardSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwner,)

    def get_queryset(self):
        # Filter query to only dashboards user owns
        return Dashboard.objects.filter(owner=self.request.user)

    def pre_save(self, obj):
        obj.owner = self.request.user


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    This endpoint presents the users in the system.
    ------------------------------------------

    _Authentication Required_ - Authenticated user will only have read-only
    access their own profile
    """

    User = get_user_model()

    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Filter query to show currently authenticated user
        return self.User.objects.filter(
            username=self.request.user.username,
            cloud_fqdn=self.request.user.cloud_fqdn)


class DevicesList(APIView):
    """
    View to list devices belonging to the user
    ------------------------------------------

    *GET* - List devices from the user's Device Cloud account

    *POST* - Provision a new device to user's Device Cloud account.
                Required field:

    `mac` - MAC address of the module to provision

     _Authentication Required_
    """

    def get(self, request, format=None):
        """
        Return a list of Xbee WiFi devices on the authenticated user's Device
        Cloud account
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            devices = conn.get_device_list(
                device_types=settings.SUPPORTED_DEVICE_TYPES)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if 'items' in devices:
            # Save a cached local list of devices for this user, which we can
            # check to control access to signals, etc
            request.session['user_devices'] = \
                [device['devConnectwareId'] for device in devices['items']]
            # Inject a url to each item pointing to the individual view for
            # that device
            for device in devices['items']:
                device['url'] = reverse(
                    'devices-detail',
                    kwargs={'device_id': str(device['devConnectwareId'])},
                    request=request)

        return Response(data=devices)

    def post(self, request, format=None):
        """
        Provision a new device to authenticated user's Device Cloud account
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        if 'mac' in request.DATA:
            mac = request.DATA['mac']
        else:
            return Response(status.HTTP_400_BAD_REQUEST,
                            data="MAC address field required")

        try:
            resp = conn.provision_device(mac)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # clear out the session device list cache
        if 'user_devices' in request.session:
            del request.session['user_devices']

        return Response(data=resp)


class DevicesDetail(APIView):
    """
    View to show details for an individual devices
    ------------------------------------------

    *GET* - Show DeviceCore data for the the specified device

     _Authentication Required_
    """

    def get(self, request, device_id=None, format=None):
        """
        Return a single Xbee WiFi devices, and provide links to data and config
        views
        """

        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            device = conn.get_device_list(device_id=device_id)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if 'items' in device:
            # Inject a url pointing to the config and data views
            for dev in device['items']:
                dev['io-url'] = reverse(
                    'device-io',
                    kwargs={'device_id': str(dev['devConnectwareId'])},
                    request=request)
                dev['config-url'] = reverse(
                    'device-config',
                    kwargs={'device_id': str(dev['devConnectwareId'])},
                    request=request)
                dev['serial-url'] = reverse(
                    'device-serial',
                    kwargs={'device_id': str(dev['devConnectwareId'])},
                    request=request)
                dev['data-url'] = reverse(
                    'device-datastream-list',
                    kwargs={'device_id': str(dev['devConnectwareId'])},
                    request=request)

        return Response(data=device)


class DeviceIO(APIView):
    """
    View to handle changing I/O state of the device.
    ----------------------------------------

    *PUT* - Change output levels. Takes name/state pairs.
        When name matches DIO#, state is expected to be a boolean for new
        output level (ex. {"DIO0":true}).
        For convenience, two character AT commands can also be used for
        changing persistent InputOutput settings via rci set_setting command,
        state is passed as-is (ex. {"M0":"0x100"})
    """
    # Fast string stripping, see http://stackoverflow.com/a/1280823
    delchars = ''.join(c for c in map(chr, range(256)) if not c.isalnum())

    def put(self, request, device_id):

        io_command_pairs = []
        io_set_setting_pairs = []
        io_serial_data_values = []

        # Sanitize and sort inputs
        for name, value in request.DATA.iteritems():
            # May get '/' seperators, mixed case, etc. Strip out non-alphanum
            # chars, make uppercase.
            name = str(name).translate(None, self.delchars).upper()

            # Check for DIO and extract the bit position of this pin
            match = re.match(r"(DIO)(?P<bit>[0-9]+)", name)
            if match:
                bit = match.group('bit')

                # Convert boolean-ish values to True/False
                if type(value) == str or type(value) == unicode:
                    try:
                        value = bool(strtobool(value))
                    except ValueError:
                        # Try to catch "high"/"low"
                        if value.lower() == "high":
                            value = True
                        elif value.lower() == "low":
                            value = False
                        else:
                            return Response(status=status.HTTP_400_BAD_REQUEST)
                io_command_pairs.append((int(bit), value))
            # Else see if it looks like a traditional AT command
            elif len(name) == 2:  # M0, etc AT command, used for PWM setting
                # Some commands require hex strings, others integers, others
                # arbitrary text...ug
                try:
                    # Hex
                    if name in ['M0', 'M1', 'IC', 'PR', 'PD', 'DS']:
                        val_str = hex(int(value))
                    elif (name in ['LT', 'RP', 'IR', 'IF'] or
                            name.startswith('T') or name.startswith('Q')):
                        val_str = str(int(value))
                    else:
                        # Use as is
                        val_str = str(value)
                except ValueError:
                    return Response(status=status.HTTP_400_BAD_REQUEST)

                io_set_setting_pairs.append((name, val_str))
            # Handle serial output. Currently don't support sending to
            # different targets, so combine all
            # serial messages into a single payload
            elif name.startswith("SERIAL"):
                io_serial_data_values.append(value)
            else:
                # Unknown command provided
                return Response(status=status.HTTP_400_BAD_REQUEST)

        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        resp = {}

        try:
            # For IO command, need to generate two bitmasks - enable and level
            if len(io_command_pairs):
                enable_mask = 0
                output_mask = 0
                for bit, value in io_command_pairs:
                    enable_mask |= 1 << int(bit)
                    output_mask |= value << int(bit)
                resp = conn.set_output(device_id,
                                       hex(enable_mask), hex(output_mask))

            if len(io_set_setting_pairs):
                # Because these settings belong to a single known group, we can
                # construct the request for the user
                new_settings = {'InputOutput': {}}
                for name, val in io_set_setting_pairs:
                    new_settings['InputOutput'][name] = val
                resp = conn.set_device_settings(device_id, new_settings)

            if len(io_serial_data_values):
                data = "".join(io_serial_data_values)
                data = base64.b64encode(data)
                resp = conn.send_serial_data(device_id, data)

        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if is_key_in_nested_dict(resp, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=resp)

        return Response(data=resp)


class DeviceConfig(APIView):
    """
    View to show settings configuration for an individual device
    If a settings group is specified (e.g. /config/<group>), query will be
    limited in scope to just that group
    ------------------------------------------

    *GET* - Show SCI/RCI query_setting for the the specified device.

      - Query params: ?cache="true/false" - Whether to return cached settings,
        or query the device. Default false.

    *PUT* - Set device settings via SCI/RCI set_setting. Accepts a json object
            of the form `{"setting_group" : {"key":"value", ...}, ...}`

     _Authentication Required_
    """

    def get(self, request, device_id=None, format=None):
        """
        Query Device Cloud to return current device settings
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        cache = bool(strtobool(request.QUERY_PARAMS.get('cache', 'False')))

        try:
            settings = conn.get_device_settings(device_id, cache=cache)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # If we're at the top level, for each setting group found, inject a
        # link to that subview
        try:
            device = settings['sci_reply']['send_message']['device']
            settings_resp = device['rci_reply']['query_setting']
            for group_name, dict in settings_resp.items():
                settings_resp[str(group_name) + '-url'] = reverse(
                    'device-config-group',
                    kwargs={
                        'device_id': device_id,
                        'settings_group': str(group_name)
                    },
                    request=request)
        except KeyError:
            settings_resp = {}

        # We need a bit of extra parsing to determine if the request really
        # succeeded. Device cloud always returns 200, errors are shown as
        # elements in the body. Our (overly) simple scheme will check for the
        # presence of any error element
        if is_key_in_nested_dict(settings, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=settings)

        # Compare the config with Cloud Kit stock settings, return diff
        resp = settings_resp
        settings['config-kit-stock-values'] = compare_config_with_stock(resp)
        settings['config-kit-stock-apply-url'] = reverse(
            'device-config-stock',
            kwargs={'device_id': device_id},
            request=request)

        return Response(data=settings)

    def put(self, request, device_id=None):
        # Basic sanity check on the values we're trying to send
        for group, settings in request.DATA.items():
            if not type(settings) == dict:
                return Response(status=status.HTTP_400_BAD_REQUEST)
            else:
                for key, val in settings.items():
                    if not isinstance(val, (int, float, bool, str, unicode)):
                        return Response(status=status.HTTP_400_BAD_REQUEST)

        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            settings = conn.set_device_settings(device_id,
                                                settings=request.DATA)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # We need a bit of extra parsing to determine if the request really
        # succeeded. Device cloud always returns 200, errors are shown as
        # elements in the body. Our (overly) simple scheme will check for the
        # presence of any error element
        if is_key_in_nested_dict(settings, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=settings)

        return Response(data=settings)


class DeviceConfigGroup(APIView):
    """
    View to show a specific settings group configuration for an individual
    device
    ------------------------------------------

    *GET* - Show SCI/RCI query_setting for the the specified device & settings
            group

      - Query params: ?cache="true/false" - Whether to return cached settings,
        or query the device. Default false.

    *PUT* - Set device settings via SCI/RCI set_setting. Takes key/value pairs
            of setting name/value

     _Authentication Required_
    """

    def get(self, request, device_id, settings_group, format=None):
        """
        Query Device Cloud to return current device settings
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        cache = bool(strtobool(request.QUERY_PARAMS.get('cache', 'False')))

        try:
            settings = conn.get_device_settings(
                device_id, settings_group=settings_group, cache=cache)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # We need a bit of extra parsing to determine if the request really
        # succeeded. Device cloud always returns 200, errors are shown as
        # elements in the body. Our (overly) simple scheme will check for the
        # presence of any error element
        if is_key_in_nested_dict(settings, 'error'):
            return Response(status=status.HTTP_504_GATEWAY_TIMEOUT,
                            data=settings)

        return Response(data=settings)

    def put(self, request, device_id, settings_group, format=None):
        """
        Apply new settings to the device
        """
        # Because these settings belong to a single known group, we can
        # construct the request for the user
        new_settings = {settings_group: request.DATA}

        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            settings = conn.set_device_settings(device_id, new_settings)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # We need a bit of extra parsing to determine if the request really
        # succeeded. Device cloud always returns 200, errors are shown as
        # elements in the body. Our (overly) simple scheme will check for the
        # presence of any error element
        if is_key_in_nested_dict(settings, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=settings)

        return Response(data=settings)


class DeviceConfigStock(APIView):
    """
    Apply the default Kit configuration to the XBee module
    ------------------------------------------

    *PUT* - Set device settings to Kit defaults. No request content required.

     _Authentication Required_
    """

    def put(self, request, device_id=None):
        # First query for existing config, calculate diff
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            settings = conn.get_device_settings(device_id)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Check for any errors in query
        if is_key_in_nested_dict(settings, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=settings)

        try:
            device = settings['sci_reply']['send_message']['device']
            settings_resp = device['rci_reply']['query_setting']
        except KeyError:
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=settings)

        # Compare the config with Cloud Kit stock settings, return diff
        settings_diff = compare_config_with_stock(settings_resp)

        # If there is a difference, send the new config to device
        if settings_diff:
            try:
                settings_response = conn.set_device_settings(
                    device_id, settings=settings_diff)
            except HTTPError, e:
                return Response(status=e.response.status_code,
                                data=e.response.text)
            except ConnectionError, e:
                return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Check for any errors in response
            if is_key_in_nested_dict(settings_response, 'error'):
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                data=settings_response)

            return Response(data=settings_response)
        else:
            return Response(status=status.HTTP_200_OK)


class DeviceSerial(APIView):
    """
    Send data out serial port of devices
    ------------------------------------------

    *POST* - Send binary data to module's serial port.

    The following field is required:

    * `data` - payload

    The following field is optional:

    * `is_base64` - Whether 'data' is Base64 encoded. Defaults to false, in
                    which case server will perform encoding.

     _Authentication Required_
    """

    def post(self, request, device_id):
        """
        Send data to device serial
        """

        try:
            data = request.DATA['data']
        except KeyError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            is_encoded = request.DATA['is_base64']
            needs_encoding = not strtobool(is_encoded)
        except KeyError:
            needs_encoding = True
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if needs_encoding:
            data = base64.b64encode(data)

        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            response = conn.send_serial_data(device_id, data)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # We need a bit of extra parsing to determine if the request really
        # succeeded. Device cloud always returns 200, errors are shown as
        # elements in the body. Our (overly) simple scheme will check for the
        # presence of any error element
        if is_key_in_nested_dict(response, 'error'):
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data=response)

        return Response(data=response)


class DevicesDatastreamList(APIView):
    """
    View to show Data Streams available for an individual device
    ------------------------------------------

    *GET* - Show available Data Streams for this device

     _Authentication Required_
    """

    def get(self, request, device_id=None, format=None):
        """
        Query Device Cloud to return current device settings
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        try:
            data_streams = conn.get_datastream_list(device_id=device_id)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if 'items' in data_streams:
            # Inject a url pointing to the config and data views
            for stream in data_streams['items']:
                stream['datapoint-url'] = reverse(
                    'device-datapoint-list',
                    kwargs={
                        'device_id': device_id,
                        'stream_id': str(stream['streamId'])
                    },
                    request=request)

        return Response(data=data_streams)


class DevicesDatapointList(APIView):
    """
    View to show DataPoints in a given DataStream
    ------------------------------------------

    *GET* - Show historical DataPoints for the specified stream

    Optional Query Parameters:

    * `startTime` - POSIX timestamp in seconds. Defaults to 5 minutes in the
                    past.

     _Authentication Required_
    """

    def get(self, request, device_id=None, stream_id=None, format=None):
        """
        Query Device Cloud for DataPoints
        """
        username, password, cloud_fqdn = get_credentials(request)

        if not username or not password or not cloud_fqdn:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        conn = DeviceCloudConnector(username, password, cloud_fqdn)

        # Only show the data from the last x minutes
        if 'startTime' in request.GET:
            try:
                time = datetime.utcfromtimestamp(
                    float(request.GET['startTime']))
            except ValueError:
                return Response(status=status.HTTP_400_BAD_REQUEST)
        else:
            time = datetime.utcnow() - timedelta(minutes=5)
        time_no_micro = time.replace(microsecond=0)
        iso_time = time_no_micro.isoformat()+'z'

        try:
            data_points = conn.get_datapoints(stream_id, iso_time)
        except HTTPError, e:
            return Response(status=e.response.status_code,
                            data=e.response.text)
        except ConnectionError, e:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(data=data_points)
