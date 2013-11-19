#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2013 Digi International Inc., All Rights Reserved.
#

"""
Simple library to handle common Device Cloud operations

"""
import logging
import requests
import xmltodict
from collections import OrderedDict

logger = logging.getLogger(__name__)

ws_uri = "https://{fqdn}/ws/{resource}/{path_filter}"

USERINFO_RESOURCE = 'UserInfo'
DEVICECORE_RESOURCE = 'DeviceCore'
DATASTREAM_RESOURCE = 'DataStream'
DATAPOINT_RESOURCE = 'DataPoint'
SCI_RESOURCE = 'sci'
MONITOR_RESOURCE = 'Monitor'


def _parse_response(response):
    """
    Convert the Requests response content to a python dictionary by parsing out
    json/xml
    """
    if 'application/xml' in response.headers['Content-Type']:
        # XML content, run through xmltodict
        return xmltodict.parse(response.text)
    elif 'application/json' in response.headers['Content-Type']:
        # JSON content, use request's built in parser
        return response.json()
    else:
        logger.warning('Recieved non xml/json content from Device Cloud: %s' %
                       response.headers['Content-Type'])
        # Unexpected content type, try to parse as json (which we asked for)
        try:
            return response.json()
        except ValueError:
            pass
        logger.warning('unable to parse out json, returning text')
        return response.text


class DeviceCloudConnector(object):

    def __init__(self, username, password, cloud_fqdn):
        """
        Args:
            username (str): Device Cloud Account Username
            password (str): Device Cloud Account Password
            cloud_fqdn (str): Device Cloud Fully Qualified Domain Name (ex
                                'login.etherios.com')
        """
        self.cloud_fqdn = cloud_fqdn
        # Requests session, defaults
        r = requests.Session()
        r.auth = (username, password)
        r.headers.update({'Accept': 'application/json'})
        self.r = r

    # Helper methods to wrap common requests logic
    def _get(self, *args, **kwargs):
        response = self.r.get(*args, **kwargs)
        logger.info("GET on %s" % response.url)
        logger.debug("Response %s: %s" % (response.status_code, response.text))
        response.raise_for_status()
        return response

    def _post(self, *args, **kwargs):
        response = self.r.post(*args, **kwargs)
        logger.info("POST on %s" % response.url)
        logger.debug("POST data: %s" % kwargs['data'])
        logger.debug("Response %s: %s" % (response.status_code, response.text))
        response.raise_for_status()
        return response

    def _put(self, *args, **kwargs):
        response = self.r.put(*args, **kwargs)
        logger.info("PUT on %s" % response.url)
        logger.debug("PUT data: %s" % kwargs['data'])
        logger.debug("Response %s: %s" % (response.status_code, response.text))
        response.raise_for_status()
        return response

    def _delete(self, *args, **kwargs):
        response = self.r.delete(*args, **kwargs)
        logger.info("DELETE on %s" % response.url)
        logger.debug("Response %s: %s" % (response.status_code, response.text))
        response.raise_for_status()
        return response

    def authenticate(self):
        """
        Authenticate against Device Cloud by querying UserInfo

        Args: None

        Returns:
            Tuple (bool, dict) - True if response status 200, and the parsed
                                    response body

        """
        try:
            r = self._get(ws_uri.format(resource=USERINFO_RESOURCE,
                                        fqdn=self.cloud_fqdn,
                                        path_filter=""))
        except requests.exceptions.HTTPError, e:
            if e.response.status_code == requests.codes['unauthorized']:
                return False, _parse_response(e.response)
            else:
                raise e

        return r.status_code == requests.codes['ok'], _parse_response(r)

    def get_device_list(self, device_types=[], device_id=None):
        """
        Get a list of devices on the user's Device Cloud account by querying
        DeviceCore

        Args: None

        Kwargs:
            device_types - list(str): List of device types that query will be
                            filtered to.
                Defaults to an empty list, which will return all types of
                devices.
            device_id (str) - If provided, the request will be filtered to just
                            that device id

        Returns:
            Python object loaded from Device Cloud JSON response
        """
        dev_type_cond = " or ".join(
            ["dpDeviceType='%s'" % dtype for dtype in device_types])

        dev_id_cond = " or ".join(
            ["devConnectwareId='%s'" % dev_id for dev_id in
                filter(None, [device_id])])

        params = {
            'condition': " and ".join(
                filter(None, (dev_type_cond, dev_id_cond)))
        }

        uri = ws_uri.format(
            resource=DEVICECORE_RESOURCE, fqdn=self.cloud_fqdn, path_filter="")
        r = self._get(uri, params=params)

        return _parse_response(r)

    def provision_device(self, mac):
        """
        Provision a device to the user's Device Cloud account

        Args:
            mac (str) - mac address of the device
        """
        post_dict = {
            'DeviceCore': {
                'devMac': mac,
            },
        }
        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(
            resource=DEVICECORE_RESOURCE, fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def get_datastream_list(self, stream_prefix="", device_id=None):
        """
        Get a list of DataStreams available to the user.

        Args: None

        Kwargs:
            stream_prefix (str) - Will be used to filter datastreams. For most
                    devices, the default should be ok.
            device_id (str) - If provided, filter the query to only streams
                    from this device.

        Returns:
            Python object loaded from Device Cloud JSON response
        """
        stream_path = '/'.join(filter(None, [stream_prefix, device_id]))

        uri = ws_uri.format(
            resource=DATASTREAM_RESOURCE, fqdn=self.cloud_fqdn,
            path_filter=stream_path)
        r = self._get(uri)

        return _parse_response(r)

    def get_datapoints(self, stream_id, start_time=None):
        """
        Get a list of DataStreams available to the user.

        Args:
            stream_id (str) - the stream ID to query data from
            start_time - timestamp, either epoch time (millis since start of
                            1970) or ISO 8601

        Returns:
            Python object loaded from Device Cloud JSON response
        """
        params = {
            'startTime': start_time
        }
        uri = ws_uri.format(
            resource=DATAPOINT_RESOURCE, fqdn=self.cloud_fqdn,
            path_filter=stream_id)
        r = self._get(uri, params=params)

        return _parse_response(r)

    def get_device_settings(self, device_id, settings_group=None, cache=False):
        """
        Get the settings for a device by doing an RCI query_setting

        Args:
            device_id (str) - The device to query

        Kwargs:
            cache (bool) - Whether to use Device Cloud cache. Default False.

        Returns:
            Python dict representation of xml response (using xmltodict lib)
        """
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'send_message': {
                    '@cache': str(cache),
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'rci_request': {
                        '@version': '1.1',
                        'query_setting': {},
                    },
                },
            },
        }

        # If a settings group is provided, limit query to just that group
        if settings_group:
            rci_req = post_dict['sci_request']['send_message']['rci_request']
            rci_req['query_setting'][settings_group] = {}

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(
            resource=SCI_RESOURCE, fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def set_device_settings(self, device_id, settings={}):
        """
        Send the settings for a device by doing an RCI set_setting

        Args:
            device_id (str) - The device to query
            settings (dict) - Nested dictionary, of the form
                    `{'setting_group': {'key': value, 'key2': 'value2'}, }`

        Kwargs:
            cache (bool) - Whether to use Device Cloud cache. Default False.

        Returns:
            Python dict representation of xml response (using xmltodict lib)
        """
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'send_message': {
                    '@cache': "False",
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'rci_request': {
                        '@version': '1.1',
                        'set_setting': settings,
                    },
                },
            },
        }

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=SCI_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def set_output_mask(self, device_id, enable_mask):
        """
        Prior to sending IO command, set the enable mask to control which
        outputs are affected

        Args:
            device_id (str) - The device to send the command to
            enable_mask (str) - hex string of bit map that specifies affected
                                pins

        """
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'send_message': {
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'rci_request': {
                        '@version': '1.1',
                        'set_state': {
                            'Executable': {
                                'OM': enable_mask,
                            },
                        },
                    },
                },
            },
        }

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=SCI_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def set_output_levels(self, device_id, io_mask):
        """
        Send the IO command to the XBee WiFi Module, setting temporary output
        controlled by pin timeout values

        Args:
            device_id (str) - The device to send the command to
            io_mask (str) - hex string of bit map that specifies pin levels

        """
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'send_message': {
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'rci_request': {
                        '@version': '1.1',
                        'set_state': {
                            'Executable': {
                                'IO': io_mask,
                            },
                        },
                    },
                },
            },
        }

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=SCI_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def set_output(self, device_id, enable_mask, io_mask):
        """
        Combo sci/rci command that issues OM and IO in a single request

        Args:
            device_id (str) - The device to send the command to
            enable_mask (str) - hex string of bit map that specifies affected
                                pins
            io_mask (str) - hex string of bit map that specifies pin levels

        """
        # Note: using an ordered dict to ensure OM command comes first in
        # rendered xml
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'send_message': {
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'rci_request': {
                        '@version': '1.1',
                        'set_state': {
                            'Executable': OrderedDict(
                                [('OM', enable_mask), ('IO', io_mask)])
                        },
                    },
                },
            },
        }

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=SCI_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def create_monitor(self, topic, url, auth_user, auth_pass,
                       description=None, batch_size=None, batch_duration=None):
        """
        Create a new Device Cloud http monitor for the specified topic
        """
        post_dict = {
            'Monitor': {
                'monTopic': topic,
                'monTransportType': 'http',
                'monTransportUrl': url,
                'monTransportToken': ':'.join([auth_user, auth_pass]),
                'monFormatType': 'json',
            },
        }
        if description:
            post_dict['Monitor']['monDescription'] = description
        if batch_size:
            post_dict['Monitor']['monBatchSize'] = batch_size
        if batch_duration:
            post_dict['Monitor']['monBatchDuration'] = batch_duration

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=MONITOR_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)

    def create_datapoint_monitor(self, device_id, url, auth_user,
                                 auth_pass, description=None):
        """
        Create a new Device Cloud monitor for the DataPoint resource, filtering
        to channels for given device id, and enabling batching
        """
        topic = '/'.join([DATAPOINT_RESOURCE, device_id])

        return self.create_monitor(
            topic, url, auth_user, auth_pass, description, batch_size=1000,
            batch_duration=1)

    def create_devicecore_monitor(self, url, auth_user, auth_pass,
                                  description=None):
        """
        Create a new Device Cloud monitor for the DeviceCore resource
        """
        topic = '[operation=U]' + DEVICECORE_RESOURCE

        return self.create_monitor(
            topic, url, auth_user, auth_pass, description,
            batch_size=1000, batch_duration=1)

    def get_monitors(self, topics=[], urls=[]):
        """
        Return the monitors for this account.

        Args:
            topics list(str): Filter the query to only monitors with these
                                topics
            url list(str): Filter the query to only monitors pointing to these
                            urls
        """
        topic_cond = " or ".join(["monTopic='%s'" % topic for topic in topics])
        url_cond = " or ".join(["monTransportUrl='%s'" % url for url in urls])
        params = {
            'condition': " and ".join(filter(None, (topic_cond, url_cond)))
        }

        uri = ws_uri.format(resource=MONITOR_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._get(uri, params=params)

        return _parse_response(r)

    def get_datapoint_monitor_for_device(self, device_id, url):
        """
        Wrapper around get_monitors, with the default topic generated from
        device_id
        """
        topics = ['/'.join([DATAPOINT_RESOURCE, device_id])]

        return self.get_monitors(topics, [url])

    def get_devicecore_monitor(self, url):
        """
        Wrapper around get_monitors, with the devicecore topic
        """
        topics = ['[operation=U]' + DEVICECORE_RESOURCE]

        return self.get_monitors(topics, [url])

    def kick_monitor(self, monitor_id):
        """
        Monitors may go inactive after a number of failed pushes, or be in a
        backoff state. An empty PUT will make it active again or reset backoff.
        """
        put_dict = {
            'Monitor': {
                'monId': monitor_id,
            },
        }
        put_body = xmltodict.unparse(put_dict)

        uri = ws_uri.format(resource=MONITOR_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter=monitor_id)
        r = self._put(uri, data=put_body)

        return _parse_response(r)

    def send_serial_data(self, device_id, data_b64, target_name=''):
        """
        Send data out the serial port of the device using the SCI Data Service

        args:
            device_id (str): Target device
            data_b64 (str) - Base64 encoded payload

        kwargs:
            target_name (str) - Data service target, for use with module in API
                                mode. Defaults to empty.

        """
        post_dict = {
            'sci_request': {
                '@version': '1.0',
                'data_service': {
                    'targets': {
                        'device': {
                            '@id': device_id,
                        },
                    },
                    'requests': {
                        'device_request': {
                            '@target_name': target_name,
                            '@format': 'base64',
                            '#text': data_b64,
                        }
                    },
                },
            },
        }

        post_body = xmltodict.unparse(post_dict)

        uri = ws_uri.format(resource=SCI_RESOURCE,
                            fqdn=self.cloud_fqdn, path_filter="")
        r = self._post(uri, data=post_body)

        return _parse_response(r)
