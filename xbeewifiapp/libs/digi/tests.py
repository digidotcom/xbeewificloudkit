#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

"""
This file demonstrates writing tests using the 00000001 module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
from mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.test import TestCase
from auth import DeviceCloudBackend
from forms import DeviceCloudAuthenticationForm
from devicecloud import DeviceCloudConnector
from requests.exceptions import HTTPError, ConnectionError
from requests import Response
import json

User = get_user_model()

TEST_RESPONSES = {
    'DeviceCore': {
        'GET': """{
            "requestedStartRow": "0",
            "items": [
                {
                    "dpCapabilities": "68178",
                    "devConnectwareId": "00000000-00000000-00000000-00000001",
                    "dpLastKnownIp": "192.168.1.153",
                    "cstId": "2376",
                    "devMac": "00:40:9d:5e:31:48",
                    "id": {
                        "devVersion": "1",
                        "devId": "910697"
                    },
                    "dpServerId": "",
                    "devTerminated": "false",
                    "dpGlobalIp": "70.13.247.178",
                    "devEffectiveStartDate": "2013-06-18T20:48:00.000Z",
                    "dpDeviceType": "XBee WiFi S6B TH",
                    "dpLastConnectTime": "2013-07-03T20:01:25.420Z",
                    "devRecordStartDate": "2013-06-18T20:48:00.000Z",
                    "dvVendorId": "50331694",
                    "dpFirmwareLevelDesc": "2.0.1.4",
                    "grpPath": "",
                    "grpId": "2883",
                    "dpFirmwareLevel": "33554692",
                    "dpZigbeeCapabilities": "0",
                    "dpConnectionStatus": "0",
                    "dpRestrictedStatus": "0",
                    "dpLastDisconnectTime": "2013-07-03T20:45:45.057Z"
                }
            ],
            "remainingSize": "0",
            "requestedSize": "1000",
            "resultSize": "1",
            "resultTotalRows": "1"
        }""",
    },
    'DataStream': {
        'GET': """{
            "requestedSize": "1000",
            "resultSize": "1",
            "items": [
                {
                    "cstId": "2376",
                    "streamId": "00000000-00000000-00000000-00000001/DIO/0",
                    "units": "binary",
                    "description": "",
                    "dataType": "LONG",
                    "currentValue": {
                        "serverTimestamp": "1377294095177",
                        "timestamp": "1377294095168",
                        "description": "",
                        "id": "c87139ba-0c3c-11e3-ad0c-40400cde0ac7",
                        "data": "1",
                        "quality": "0"
                    },
                    "dataTtl": "8035200",
                    "forwardTo": "",
                    "rollupTtl": "63244800"
                }
                ],
            "pageCursor": "e9fb5736-2-ceb5f44a"
        }""",
    },
    'DataPoint': {
        'GET': """{
            "requestedEndTime": "-1",
            "resultSize": "1",
            "requestedSize": "1000",
            "requestedStartTime": "0",
            "items": [
                {
                    "cstId": "2376",
                    "streamId": "00000000-00000000-00000000-00000001/DIO/0",
                    "quality": "0",
                    "timestamp": "1371656799557",
                    "description": "",
                    "id": "6e6b1b57-d8f7-11e2-b0f0-4040463f606d",
                    "data": "0",
                    "serverTimestamp": "1371656799705"
                }
            ],
            "pageCursor": "4127fe7a-09d8-11e3-a9b8-4040463f606d"
        }""",
    },
    'sci': {
        'GET': """{
            "sci_reply": {
                "@version": "1.0",
                "send_message": {
                    "device": {
                        "@id": "00000000-00000000-00000000-00000001",
                        "rci_reply": {
                            "@version": "1.1",
                            "query_setting": {
                                "InputOutput": {
                                    "D1": "Disabled"
                                }
                            }
                        }
                    }
                }
            }
        }""",
        'POST': """{
            "sci_reply": {
                "@version": "1.0",
                "send_message": {
                    "device": {
                        "@id": "00000000-00000000-00000000-00000001",
                        "rci_reply": {
                            "@version": "1.1",
                            "query_setting": {
                                "InputOutput": {
                                    "D0": "Input"
                                }
                            }
                        }
                    }
                }
            }
        }"""
    },
    'Monitor': {
        'GET': """{
            "items": [
                {
                    "monTopic": "DataPoint/00000000-00000000-00000000-00000001",
                    "monTransportType": "http",
                    "monLastSent": "2013-08-23T21:41:35.283Z",
                    "monLastConnect": "2013-08-22T16:26:37.793Z",
                    "cstId": "2376",
                    "monBatchSize": "1",
                    "monFormatType": "json",
                    "monStatus": "ACTIVE",
                    "monCompression": "none",
                    "monTransportUrl": "https://site/api/monitor",
                    "monDescription": "XBee Wi-Fi Cloud Kit Monitor",
                    "monId": "00001",
                    "monBatchDuration": "0"
                }
            ],
            "requestedSize": "1000",
            "remainingSize": "0",
            "resultSize": "1",
            "requestedStartRow": "0",
            "resultTotalRows": "1"
        }"""
    },
    'Monitor_DeviceCore': {
        'GET': """{
            "items": [
                {
                    "monTopic": "DeviceCore",
                    "monTransportType": "http",
                    "monLastSent": "2013-08-23T21:41:35.283Z",
                    "monLastConnect": "2013-08-22T16:26:37.793Z",
                    "cstId": "2376",
                    "monBatchSize": "1",
                    "monFormatType": "json",
                    "monStatus": "ACTIVE",
                    "monCompression": "none",
                    "monTransportUrl": "https://site/api/monitor",
                    "monDescription": "XBee Wi-Fi Cloud Kit Monitor",
                    "monId": "00001",
                    "monBatchDuration": "0"
                }
            ],
            "requestedSize": "1000",
            "remainingSize": "0",
            "resultSize": "1",
            "requestedStartRow": "0",
            "resultTotalRows": "1"
        }"""
    },
}


class DeviceCloudConnectorTestCase(TestCase):
    """
    Base class to be extended by tests using the DeviceCloudConnector
    """
    def create_patch(self, name):
        patcher = patch(name, autospec=True)
        mock = patcher.start()
        self.addCleanup(patcher.stop)
        return mock

    def setUp(self):
        # Patch requests to not actually do any http calls
        self.patched_get = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.get')
        self.patched_post = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.post')
        self.patched_put = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.put')
        self.patched_delete = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.delete')
        # The device cloud lib to call
        self.cloud = DeviceCloudConnector("user", "pass", "cloud")


class DeviceCloudUserTest(TestCase):

    def test_device_cloud_user_create(self):
        self.new_user = User.objects.create_user(username='user1', cloud_fqdn='cloud')
        self.assertTrue(self.new_user)
        self.assertTrue(User.objects.count()==1)

    def test_device_cloud_user_collision(self):
        self.new_user = User.objects.create_user(username='user1', cloud_fqdn='cloud')
        try:
            self.new_user2 = User.objects.create_user(username='user1', cloud_fqdn='cloud')
            # The above should have failed
            assert False
        except:
            pass


class DeviceCloudAuthenticationFormTest(TestCase):

    def setUp(self):
        # Mock the DeviceCloudConnector used by auth module to return fake success/failures
        patcher = patch('xbeewifiapp.libs.digi.auth.DeviceCloudConnector', autospec=True)
        self.mockedConnector = patcher.start()
        self.addCleanup(patcher.stop)
        mc = self.mockedConnector.return_value
        mc.authenticate.return_value = (False, {})

    def test_device_cloud_authentication_form(self):
        invalid_data_dicts = [
            # Bad credentials (serverside check)
            {'username':'baduser', 'password':'badpass',
             'cloud_fqdn': 'badserver'},
            # Missing value
            {'username':'baduser', 'cloud_fqdn': 'badserver'},
        ]
        good_data_dicts = [
            # Good credentials (serverside check)
            {'username':'gooduser', 'password':'goodpass',
             'cloud_fqdn': 'goodserver'},
        ]
        for invalid_data in invalid_data_dicts:
            form = DeviceCloudAuthenticationForm(data=invalid_data)
            self.failIf(form.is_valid())

        # Set authentication checks ok
        mc = self.mockedConnector.return_value
        mc.authenticate.return_value = (True, {})

        for good_data in good_data_dicts:
            form = DeviceCloudAuthenticationForm(data=good_data)
            self.failUnless(form.is_valid())


class DeviceCloudBackendTest(TestCase):

    def setUp(self):
        # Mock the DeviceCloudConnector used by auth module to return fake success/failures
        patcher = patch('xbeewifiapp.libs.digi.auth.DeviceCloudConnector', autospec=True)
        self.mockedConnector = patcher.start()
        self.addCleanup(patcher.stop)
        # By default cloud cred check will return valid, individual test can change this if desired
        mc = self.mockedConnector.return_value
        mc.authenticate.return_value = (True, {})
        self.backend = DeviceCloudBackend()
        self.existing_user = User.objects.create_user(username='existinguser', cloud_fqdn='cloud_fqdn')

    def tearDown(self):
        self.existing_user.delete()

    def test_auth_good_credentials(self):
        """
        Test that authentication succeeds for a good set of device cloud credentials
        """
        user = self.backend.authenticate('good#cloud_fqdn', 'creds')
        self.assertIsNotNone(user)

    def test_auth_bad_credentials(self):
        """
        Test that authentication fails for a bad set of device cloud credentials
        """
        mc = self.mockedConnector.return_value
        mc.authenticate.return_value = (False, {})
        user = self.backend.authenticate('bad#cloud_fqdn', 'creds')
        self.assertIsNone(user)

    def test_auth_missing_credentials(self):
        """
        Test that authentication fails when credentials are missing
        """
        user = self.backend.authenticate()
        self.assertIsNone(user)
        user = self.backend.authenticate('a')
        self.assertIsNone(user)

    def test_auth_existing_user(self):
        """
        Test that an existing django user is returned when
        authenticating with good credentials
        """
        starting_user_count = User.objects.count()
        user = self.backend.authenticate('existinguser#cloud_fqdn', 'password')
        ending_user_count = User.objects.count()
        self.assertIsNotNone(user)
        self.assertEqual(user, self.existing_user)
        self.assertEquals(starting_user_count, ending_user_count)

    def test_auth_new_user(self):
        """
        Test that a new django user is created when authenticating
        with good credentials if a matching one doesn't exist
        """
        starting_user_count = User.objects.count()
        user = self.backend.authenticate('newuser#cloud_fqdn', 'password')
        ending_user_count = User.objects.count()
        self.assertIsNotNone(user)
        self.assertNotEqual(user, self.existing_user)
        self.assertEquals(starting_user_count+1, ending_user_count)


class DeviceCloudConnectorAuthenticateTest(DeviceCloudConnectorTestCase):
    def setUp(self):
        super(DeviceCloudConnectorAuthenticateTest, self).setUp()

    def test_authenticate_good(self):
        self.patched_get.return_value.status_code = 200

        good_creds, resp = self.cloud.authenticate()
        self.assertTrue(good_creds)

    def test_authenticate_bad(self):
        self.patched_get.return_value.status_code = 401

        good_creds, resp = self.cloud.authenticate()
        self.assertFalse(good_creds)


class DeviceCloudConnectorDeviceTest(DeviceCloudConnectorTestCase):

    def setUp(self):
        super(DeviceCloudConnectorDeviceTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['DeviceCore']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_device_query(self):
        devices = self.cloud.get_device_list(device_types=[])
        self.assertTrue(self.patched_get.called)
        self.assertIsNotNone(devices)
        self.assertEqual(devices['resultSize'], "1")
        self.assertEqual(devices['items'][0]['devConnectwareId'], "00000000-00000000-00000000-00000001")

    def test_provision_device(self):
        mac = "00:00:00:00:00:01"
        xml = """<?xml version="1.0" encoding="utf-8"?>\n<DeviceCore><devMac>00:00:00:00:00:01</devMac></DeviceCore>"""
        self.cloud.provision_device(mac)
        self.assertTrue(self.patched_post.called)
        self.assertIn('/ws/DeviceCore', self.patched_post.call_args[0][1])
        self.assertEqual(self.patched_post.call_args[1]['data'], xml)


class DeviceCloudConnectorDataStreamTest(DeviceCloudConnectorTestCase):
    def setUp(self):
        super(DeviceCloudConnectorDataStreamTest, self).setUp()

        # result to return
        result_text = TEST_RESPONSES['DataStream']['GET']
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_datastream_query(self):
        datastreams = self.cloud.get_datastream_list()
        self.assertTrue(self.patched_get.called)
        self.assertIn('/ws/DataStream', self.patched_get.call_args[0][1])
        self.assertIsNotNone(datastreams)
        self.assertEqual(datastreams['resultSize'], "1")
        self.assertEqual(datastreams['items'][0]['streamId'], "00000000-00000000-00000000-00000001/DIO/0")

class DeviceCloudConnectorDataPointTest(DeviceCloudConnectorTestCase):
    def setUp(self):
        super(DeviceCloudConnectorDataPointTest, self).setUp()

        # result to return
        result_text = TEST_RESPONSES['DataPoint']['GET']
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_datapoint_query(self):
        stream_id = "00000000-00000000-00000000-00000001/DIO/0"
        datapoints = self.cloud.get_datapoints(stream_id)
        self.assertTrue(self.patched_get.called)
        self.assertIn('/ws/DataPoint', self.patched_get.call_args[0][1])
        self.assertIsNotNone(datapoints)
        self.assertEqual(datapoints['resultSize'], "1")
        self.assertEqual(datapoints['items'][0]['streamId'], stream_id)
        self.assertEqual(datapoints['items'][0]['data'], "0")


class DeviceCloudConnectorDeviceSettingsTest(DeviceCloudConnectorTestCase):

    def setUp(self):
        super(DeviceCloudConnectorDeviceSettingsTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['sci']['POST']

        # Mock requests to return fake device info
        self.patched_post.return_value.text = result_text
        self.patched_post.return_value.json.return_value = json.loads(result_text)

    def test_settings_rci_query(self):
        settings = self.cloud.get_device_settings("00000000-00000000-00000000-00000001")
        self.assertTrue(self.patched_post.called)
        self.assertIn('/ws/sci', self.patched_post.call_args[0][1])
        self.assertIsNotNone(settings)
        self.assertEqual(settings['sci_reply']['send_message']['device']['@id'], "00000000-00000000-00000000-00000001")
        self.assertEqual(settings['sci_reply']['send_message']['device']['rci_reply']['query_setting']['InputOutput']['D0'], "Input")

    def test_settings_group_rci_query(self):
        settings = self.cloud.get_device_settings("00000000-00000000-00000000-00000001", settings_group='InputOutput')
        self.assertTrue(self.patched_post.called)
        self.assertIn('/ws/sci', self.patched_post.call_args[0][1])
        xml = """<?xml version="1.0" encoding="utf-8"?>\n<sci_request version="1.0"><send_message cache="False"><rci_request version="1.1"><query_setting><InputOutput></InputOutput></query_setting></rci_request><targets><device id="00000000-00000000-00000000-00000001"></device></targets></send_message></sci_request>"""
        self.assertEqual(self.patched_post.call_args[1]['data'], xml)
        self.assertIsNotNone(settings)

    def test_settings_rci_set(self):
        self.cloud.set_device_settings("00000000-00000000-00000000-00000001", {"InputOutput":{"D0":"Disabled"}})
        self.assertTrue(self.patched_post.called)
        self.assertIn('/ws/sci', self.patched_post.call_args[0][1])
        xml = """<?xml version="1.0" encoding="utf-8"?>\n<sci_request version="1.0"><send_message cache="False"><rci_request version="1.1"><set_setting><InputOutput><D0>Disabled</D0></InputOutput></set_setting></rci_request><targets><device id="00000000-00000000-00000000-00000001"></device></targets></send_message></sci_request>"""
        self.assertEqual(self.patched_post.call_args[1]['data'], xml)


class DeviceCloudConnectorMonitorTest(DeviceCloudConnectorTestCase):

    def setUp(self):
        super(DeviceCloudConnectorMonitorTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['Monitor']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_monitor_get(self):
        monitors = self.cloud.get_monitors()
        self.assertTrue(self.patched_get.called)
        self.assertIn('/ws/Monitor', self.patched_get.call_args[0][1])
        self.assertIsNotNone(monitors)
        self.assertEqual(monitors['items'][0]['monTopic'], "DataPoint/00000000-00000000-00000000-00000001")

    def test_monitor_get_for_datapoint(self):
        monitor = self.cloud.get_datapoint_monitor_for_device('00000000-00000000-00000000-00000001', 'url')
        self.assertTrue(self.patched_get.called)
        self.assertIn('/ws/Monitor', self.patched_get.call_args[0][1])
        self.assertEqual("monTopic='DataPoint/00000000-00000000-00000000-00000001' and monTransportUrl='url'" ,self.patched_get.call_args[1]['params']['condition'])

    def test_monitor_create(self):
        self.cloud.create_monitor('topic', 'url', 'user', 'pass', 'desc')
        self.assertTrue(self.patched_post.called)
        self.assertIn('/ws/Monitor', self.patched_post.call_args[0][1])
        self.assertIn('<monTopic>topic</monTopic>' ,self.patched_post.call_args[1]['data'])
        self.assertIn('<monTransportUrl>url</monTransportUrl>' ,self.patched_post.call_args[1]['data'])
        self.assertIn('<monTransportToken>user:pass</monTransportToken>' ,self.patched_post.call_args[1]['data'])
        self.assertIn('<monDescription>desc</monDescription>' ,self.patched_post.call_args[1]['data'])

    def test_monitor_create_for_datapoint(self):
        self.cloud.create_datapoint_monitor('00000000-00000000-00000000-00000001', 'url', 'user', 'pass', 'desc')
        self.assertTrue(self.patched_post.called)
        self.assertIn('<monTopic>DataPoint/00000000-00000000-00000000-00000001</monTopic>' ,self.patched_post.call_args[1]['data'])

    def test_monitor_put(self):
        self.cloud.kick_monitor('monitor_id', 'user', 'pass')
        self.assertTrue(self.patched_put.called)
        self.assertIn('<monId>monitor_id</monId>', self.patched_put.call_args[1]['data'])
        self.assertIn('<monTransportToken>user:pass</monTransportToken>', self.patched_put.call_args[1]['data'])
