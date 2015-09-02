#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.client import RequestFactory
from mock import patch, MagicMock
from django.contrib.auth import get_user_model, login
from views import login_user, logout_user
from django.contrib.sessions.middleware import SessionMiddleware
from models import Dashboard
from xbeewifiapp.libs.digi.models import DeviceCloudUser
from xbeewifiapp.libs.digi.tests import TEST_RESPONSES
import json
from sockets import DeviceDataNamespace
from socketio.virtsocket import Socket
import util
import base64
from django.conf import settings
from rest_framework.test import APITestCase
from signals import MONITOR_TOPIC_SIGNAL_MAP

User = get_user_model()

class MockedCloudTestCase(APITestCase):
    """
    TestCase that mocks device cloud lib and authentication layer to prevent real network calls
    """

    def create_patch(self, name):
        patcher = patch(name, autospec=True)
        mock = patcher.start()
        self.addCleanup(patcher.stop)
        return mock

    def set_auth_result(self, auth_result):
        self.auth_result = auth_result
        if hasattr(self, 'mockedConnector'):
            mc = self.mockedConnector.return_value
            mc.authenticate.return_value = self.auth_result

    def setUp(self):
        # Patch requests to not actually do any http calls
        self.patched_get = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.get')
        self.patched_post = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.post')
        self.patched_put = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.put')
        self.patched_delete = self.create_patch('xbeewifiapp.libs.digi.devicecloud.requests.sessions.Session.delete')

        # Mock the DeviceCloudConnector used by auth module to return fake success/failures
        self.mockedConnector = self.create_patch('xbeewifiapp.libs.digi.auth.DeviceCloudConnector')
        # By default cloud cred check will return valid, individual test can change this if desired
        self.set_auth_result((True, {}))

    def do_session_middleware_stuff(self, request):
        """
        If using the RequestFactory, middleware is skipped which breaks auth. Use this to re-add session info to request
        """
        middleware = SessionMiddleware()
        middleware.process_request(request)
        request.session.save()

class MockedCloudAuthenticatedTestCase(MockedCloudTestCase):
    """
    Extension of MockedCloudTestCase that in setup creates an user and logs them in
    """

    def setUp(self):
        super(MockedCloudAuthenticatedTestCase, self).setUp()
        # Create and login an user
        self.existing_user = User.objects.create_user(username='existinguser', cloud_fqdn='existingserver')
        logged_in = self.client.login(username='existinguser#existingserver', password='pass')
        self.assertTrue(logged_in)
        # We also need credentials for this view, fake some
        session = self.client.session
        session['password_encrypted'] = 'pass'
        session['encryption_iv'] = '1234567890abcdef'
        session.save()


# ******************************
#            Login/Logout
# ******************************

class LoginUserTest(MockedCloudTestCase):

    def setUp(self):
        super(LoginUserTest, self).setUp()
        self.factory = RequestFactory()
        # Create an user to check login attempts against
        self.existing_user = User.objects.create_user(username='existinguser', cloud_fqdn='existingserver')

    def tearDown(self):
        self.existing_user.delete()

    def test_login_good_credentials(self):
        good_creds={'username': 'existinguser',
                    'password': 'goodpass',
                    'cloud_fqdn': 'existingserver',}
        request = self.factory.post(reverse(login_user), data=good_creds)
        self.do_session_middleware_stuff(request)
        resp = login_user(request)
        self.assertEqual(resp.status_code, 200)

    def test_login_bad_credentials(self):
        bad_creds={'username': 'existinguser',
                   'password': 'badpass',
                   'cloud_fqdn': 'existingserver',}
        request = self.factory.post(reverse(login_user), data=bad_creds)
        self.do_session_middleware_stuff(request)
        # Set mocked backend to fail authentication
        self.set_auth_result(False)
        resp = login_user(request)
        self.assertEqual(resp.status_code, 401)

    def test_login_missing_credentials(self):
        missing_creds={'username': 'existinguser',
                       'cloud_fqdn': 'existingserver',}
        request = self.factory.post(reverse(login_user), data=missing_creds)
        resp = login_user(request)
        self.assertEqual(resp.status_code, 400)

    def test_login_bad_methods(self):
        get_request = self.factory.get(reverse(login_user))
        resp = login_user(get_request)
        self.assertEqual(resp.status_code, 405)
        put_request = self.factory.put(reverse(login_user))
        resp = login_user(put_request)
        self.assertEqual(resp.status_code, 405)
        delete_request = self.factory.delete(reverse(login_user))
        resp = login_user(delete_request)
        self.assertEqual(resp.status_code, 405)

    def test_login_no_persistent_session(self):
        good_creds={'username': 'existinguser',
            'password': 'goodpass',
            'cloud_fqdn': 'existingserver',
            'persistent_session': 'False'}
        resp = self.client.post(reverse(login_user), good_creds)
        self.assertEqual(resp.status_code, 200)
        session_cookie = self.client.cookies['sessionid']
        self.assertEqual(session_cookie['expires'], "")

class LogoutUserTest(MockedCloudTestCase):

    def setUp(self):
        super(LogoutUserTest, self).setUp()

        # Create an user to check logout attempts against
        self.existing_user = User.objects.create_user(username='existinguser', cloud_fqdn='existingserver')
        # Log the test in
        logged_in = self.client.login(username='existinguser#existingserver', password='pass')
        self.assertTrue(logged_in)

    def tearDown(self):
        self.existing_user.delete()

    def test_logout_view(self):
        # Check that we start logged in
        self.assertIn('_auth_user_id', self.client.session)
        # Then do go through logout view
        resp = self.client.get(reverse(logout_user))
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('_auth_user_id', self.client.session)

# ******************************
#            Dashboard
# ******************************

class DashboardsViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DashboardsViewTest, self).setUp()

        self.dash1 = Dashboard(widgets='{"test":"widget"}', owner=self.existing_user)
        self.dash1.save()
        self.dash2 = Dashboard(widgets='{"test2":"widget2"}', owner=self.existing_user)
        self.dash2.save()

        self.factory = RequestFactory()

    def test_dashboard_list_read(self):
        resp = self.client.get(reverse('dashboard-list'))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertTrue(type(json_resp) is list)
        self.assertTrue(len(json_resp) == 2)
        self.assertEqual(json_resp[0]['widgets'], self.dash1.widgets)

    def test_dashboard_detail_read(self):
        resp = self.client.get(reverse('dashboard-list')+'/{}'.format(self.dash1.pk))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertTrue(type(json_resp) is not list)
        self.assertEqual(json_resp['widgets'], self.dash1.widgets)

    def test_unauthenticated_dashboard_read(self):
        self.client.logout()
        resp = self.client.get(reverse('dashboard-list'))
        self.assertEqual(resp.status_code, 403)

    def test_dashboard_create(self):
        old_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        body = {'widgets':'{"test3":"widget3"}'}
        resp = self.client.post(reverse('dashboard-list'), data=body)
        self.assertEqual(resp.status_code, 201)
        new_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        self.assertEqual(old_dash_count + 1, new_dash_count)

    def test_dashboard_bad_create(self):
        old_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        bad_body = {'widgets':'{"badjsson'}
        resp = self.client.post(reverse('dashboard-list'), data=bad_body)
        self.assertEqual(resp.status_code, 400)
        new_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        self.assertEqual(old_dash_count, new_dash_count)

    def test_dashboard_update(self):
        dashes = self.client.get(reverse('dashboard-list'))
        dash_loc = dashes.data[0]['url']
        new_widget = {"widgets":{"new":"widget"}}
        resp = self.client.put(dash_loc, new_widget)
        self.assertEqual(resp.status_code, 200)
        widget = self.client.get(dash_loc)
        self.assertEqual(widget.data['widgets'], new_widget['widgets'])

    def test_dashboard_delete(self):
        old_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        dashes = self.client.get(reverse('dashboard-list'))
        dash_loc = dashes.data[0]['url']
        resp = self.client.delete(dash_loc)
        self.assertEqual(resp.status_code, 204)
        new_dash_count = Dashboard.objects.filter(owner = self.existing_user).count()
        self.assertEqual(old_dash_count-1, new_dash_count)


# ******************************
#            User
# ******************************

class UserViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(UserViewTest, self).setUp()

    def test_unauthenticated_user_list_read(self):
        self.client.logout()
        resp = self.client.get(reverse('deviceclouduser-list'))
        self.assertEqual(resp.status_code, 403)

    def test_user_list_read(self):
        resp = self.client.get(reverse('deviceclouduser-list'))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertTrue(type(json_resp) is list)
        self.assertEqual(len(json_resp), 1)
        self.assertEqual(json_resp[0]['username'], 'existinguser')
        self.assertEqual(json_resp[0]['cloud_fqdn'], 'existingserver')

    def test_user_bad_methods(self):
        post_request = self.client.post(reverse('deviceclouduser-list'))
        self.assertEqual(post_request.status_code, 405)
        put_request = self.client.put(reverse('deviceclouduser-list'))
        self.assertEqual(put_request.status_code, 405)
        delete_request = self.client.delete(reverse('deviceclouduser-list'))
        self.assertEqual(delete_request.status_code, 405)


# ******************************
#            Devices
# ******************************

class DevicesViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DevicesViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['DeviceCore']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_device_list_read(self):
        self.client.logout()
        resp = self.client.get(reverse('devices-list'))
        self.assertEqual(resp.status_code, 403)

    def test_device_list_read(self):
        resp = self.client.get(reverse('devices-list'))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)
        self.assertEqual(json_resp['resultSize'], "1")
        self.assertEqual(json_resp['items'][0]['devConnectwareId'], "00000000-00000000-00000000-00000001")
        # Check that a url for the individual device view got injected
        self.assertIn('url', json_resp['items'][0].keys())
        self.assertTrue(reverse('devices-detail', kwargs={'device_id': '00000000-00000000-00000000-00000001'}) in json_resp['items'][0]['url'])

    def test_device_provision_bad(self):
        resp = self.client.post(reverse('devices-list'), {'no': 'value'})
        self.assertEqual(resp.status_code, 400)

    def test_device_provision(self):
        device = {'mac': '123456'}
        resp = self.client.post(reverse('devices-list'), device)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self.patched_post.called)
        self.assertIn("<DeviceCore><devMac>123456</devMac></DeviceCore>", self.patched_post.call_args[1]['data'])



class DeviceDetailViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceDetailViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['DeviceCore']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_device_detail_read(self):
        self.client.logout()
        resp = self.client.get(reverse('devices-detail', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 403)

    def test_device_detail_read(self):
        resp = self.client.get(reverse('devices-detail', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)
        self.assertEqual(json_resp['resultSize'], "1")
        self.assertEqual(json_resp['items'][0]['devConnectwareId'], "00000000-00000000-00000000-00000001")
        # Check that urls for the config and data views got injected
        self.assertIn('config-url', json_resp['items'][0].keys())
        self.assertTrue(reverse('device-config', kwargs={'device_id': '00000000-00000000-00000000-00000001'}) in json_resp['items'][0]['config-url'])
        self.assertIn('data-url', json_resp['items'][0].keys())
        self.assertTrue(reverse('device-datastream-list', kwargs={'device_id': '00000000-00000000-00000000-00000001'}) in json_resp['items'][0]['data-url'])


# ******************************
#            Device Config
# ******************************
class DeviceConfigViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceConfigViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['sci']['POST']
        result_text_get = TEST_RESPONSES['sci']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text_get
        self.patched_get.return_value.json.return_value = json.loads(result_text_get)
        self.patched_post.return_value.text = result_text
        self.patched_post.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_device_config_read(self):
        self.client.logout()
        resp = self.client.get(reverse('device-config', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 403)

    def test_device_config_read(self):
        resp = self.client.get(reverse('device-config', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)
        self.assertEqual(json_resp['sci_reply']['send_message']['device']['rci_reply']['query_setting']['InputOutput']['D0'], "Input")
        # Check that urls for the config groups got injected
        self.assertIn('InputOutput-url', json_resp['sci_reply']['send_message']['device']['rci_reply']['query_setting'].keys())
        self.assertTrue(reverse('device-config-group', kwargs={'device_id': '00000000-00000000-00000000-00000001', 'settings_group': 'InputOutput'}) in json_resp['sci_reply']['send_message']['device']['rci_reply']['query_setting']['InputOutput-url'])

    def test_device_config_group_read(self):
        resp = self.client.get(reverse('device-config-group', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'settings_group': 'InputOutput'}))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)

    def test_device_config_put(self):
        path = reverse('device-config', kwargs={'device_id': "00000000-00000000-00000000-00000001"})
        config = {'InputOutput': {'D0': 'Disabled'}}
        resp = self.client.put(path, config)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self.patched_post.called)
        self.assertIn("<set_setting><InputOutput><D0>Disabled</D0></InputOutput></set_setting>", self.patched_post.call_args[1]['data'])

    def test_device_config_group_put(self):
        path = reverse('device-config-group', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'settings_group': 'InputOutput'})
        config = {'D0': 'Disabled'}
        resp = self.client.put(path, config)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self.patched_post.called)
        self.assertIn("<set_setting><InputOutput><D0>Disabled</D0></InputOutput></set_setting>", self.patched_post.call_args[1]['data'])

    def test_device_config_stock_put(self):
        path = reverse('device-config-stock', kwargs={'device_id': "00000000-00000000-00000000-00000001"})
        resp = self.client.put(path)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self.patched_post.called)

# ******************************
#            Device IO
# ******************************
class DeviceIOViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceIOViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['sci']['POST']

        # Mock requests to return fake device info
        self.patched_post.return_value.text = result_text
        self.patched_post.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_device_io_read(self):
        self.client.logout()
        resp = self.client.put(reverse('device-io', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 403)

    def test_device_io_bad(self):
        bad_data = {"NOTA":"VALIDCOMMAND"}
        resp = self.client.put(reverse('device-io', kwargs={'device_id': "00000000-00000000-00000000-00000001"}), bad_data)
        self.assertEqual(resp.status_code, 400)

    def test_device_io_good(self):
        good_data = {"DIO/2": 1, "D1": "high", "serial/0": "asdf"}
        resp = self.client.put(reverse('device-io', kwargs={'device_id': "00000000-00000000-00000000-00000001"}), good_data)
        self.assertEqual(resp.status_code, 200)

# ******************************
#            Device Data
# ******************************

class DeviceDataStreamViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceDataStreamViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['DataStream']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_datastream_read(self):
        self.client.logout()
        resp = self.client.get(reverse('device-datastream-list', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 403)

    def test_device_datastream_read(self):
        resp = self.client.get(reverse('device-datastream-list', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)
        test_stream = "00000000-00000000-00000000-00000001/DIO/0"
        self.assertEqual(json_resp['items'][0]['streamId'], test_stream)
        # Check that urls for the datapoints got injected
        self.assertIn('datapoint-url', json_resp['items'][0].keys())
        self.assertIn(reverse('device-datapoint-list', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'stream_id': test_stream}), json_resp['items'][0]['datapoint-url'])


class DeviceDataPointViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceDataPointViewTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['DataPoint']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)

    def test_unauthenticated_datapoint_read(self):
        self.client.logout()
        resp = self.client.get(reverse('device-datapoint-list', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'stream_id': "00000000-00000000-00000000-00000001/DIO/0"}))
        self.assertEqual(resp.status_code, 403)

    def test_device_datapoint_read_bad_starttime(self):
        resp = self.client.get(reverse('device-datapoint-list', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'stream_id': "00000000-00000000-00000000-00000001/DIO/0"}),
                               {'startTime': 'notavalidtimestamp'})
        self.assertEqual(resp.status_code, 400)

    def test_device_datapoint_read(self):
        resp = self.client.get(reverse('device-datapoint-list', kwargs={'device_id': "00000000-00000000-00000000-00000001", 'stream_id': "00000000-00000000-00000000-00000001/DIO/0"}))
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp)
        self.assertEqual(str(len(json_resp['items'])), json_resp['resultSize'])
        self.assertEqual(json_resp['items'][0]['data'], "0")


# ******************************
#            Device Serial
# ******************************
class DeviceSerialViewTest(MockedCloudAuthenticatedTestCase):

    def setUp(self):
        super(DeviceSerialViewTest, self).setUp()

    def test_unauthenticated_serial_post(self):
        self.client.logout()
        resp = self.client.post(reverse('device-serial', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 403)

    def test_serial_post_bad(self):
        resp = self.client.post(reverse('device-serial', kwargs={'device_id': "00000000-00000000-00000000-00000001"}))
        self.assertEqual(resp.status_code, 400)

    def test_serial_post_good(self):
        resp = self.client.post(reverse('device-serial', kwargs={'device_id': "00000000-00000000-00000000-00000001"}), {"data":"test"})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self.patched_post.called)

# ******************************
#            Monitors
# ******************************
class MonitorReceiverTest(APITestCase):

    path = reverse('monitor_receiver')
    mon_push_content = """{
                          "Document": {
                            "Msg": {
                              "group": "*",
                              "topic": "1\/DataPoint\/dia\/channel\/00000000-00000000-00000000-00000001\/DIO\/0",
                              "timestamp": "2013-08-27T16:17:07.360Z",
                              "operation": "INSERTION",
                              "DataPoint": {
                                "data": 0,
                                "timestamp": 1377620227161,
                                "description": "",
                                "serverTimestamp": 1377620227253,
                                "quality": 0,
                                "id": "1",
                                "cstId": 1,
                                "streamId": "dia\/channel\/00000000-00000000-00000000-00000001\/DIO\/0"
                              }
                            }
                          }
                        }"""
    mon_push_body = json.loads(mon_push_content)
    good_user = settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER
    good_pass = settings.SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS
    good_auth_header = 'Basic ' + base64.b64encode(':'.join([good_user, good_pass]))

    def test_bad_method(self):
        resp = self.client.get(self.path, self.mon_push_body)
        self.assertEqual(resp.status_code, 405)
        resp = self.client.post(self.path, self.mon_push_body)
        self.assertEqual(resp.status_code, 405)
        resp = self.client.delete(self.path, self.mon_push_body)
        self.assertEqual(resp.status_code, 405)

    def test_missing_credentials(self):
        resp = self.client.put(self.path, self.mon_push_body)
        self.assertEqual(resp.status_code, 403)

    def test_bad_credentials(self):
        auth_header = 'Basic ' + base64.b64encode(':'.join(['bad' + self.good_user, self.good_pass]))
        resp = self.client.put(self.path, self.mon_push_body, **{'HTTP_AUTHORIZATION': auth_header})
        self.assertEqual(resp.status_code, 401)

    def test_bad_topic(self):
        resp = self.client.put(self.path, {"bad":1}, **{'HTTP_AUTHORIZATION': self.good_auth_header})
        self.assertEqual(resp.status_code, 400)

    def test_receiver_datapoint(self):
        # We should get a 503 if nothing is listening
        resp = self.client.put(self.path, self.mon_push_body, **{'HTTP_AUTHORIZATION': self.good_auth_header})
        self.assertEqual(resp.status_code, 503)
        # We should get a 200 if something is
        receiver_mock = MagicMock()
        MONITOR_TOPIC_SIGNAL_MAP['DataPoint']['00000000-00000000-00000000-00000001'].connect(receiver_mock)
        resp = self.client.put(self.path, self.mon_push_body, **{'HTTP_AUTHORIZATION': self.good_auth_header})
        self.assertEqual(resp.status_code, 200)
        # Check that the signal reciever was called properly
        self.assertTrue(receiver_mock.called)
        self.assertEqual(receiver_mock.call_count, 1)
        args, kwargs = receiver_mock.call_args
        self.assertEqual(kwargs['device_id'], '00000000-00000000-00000000-00000001')
        self.assertEqual(kwargs['data'], self.mon_push_body["Document"]["Msg"])

    def test_reciever_other_resource(self):
        other_body = """{
                          "Document": {
                            "Msg": {
                              "topic": "1\/OtherTopic\/"
                              }
                          }
                      }"""
        # Register for DataPoint, send something else
        receiver_mock = MagicMock()
        MONITOR_TOPIC_SIGNAL_MAP['DataPoint']['00000000-00000000-00000000-00000001'].connect(receiver_mock)
        resp = self.client.put(self.path, json.loads(other_body), **{'HTTP_AUTHORIZATION': self.good_auth_header})
        self.assertEqual(resp.status_code, 503)
        self.assertFalse(receiver_mock.called)

class MonitorSetupTest(MockedCloudAuthenticatedTestCase):

    path = reverse('monitor_setup', kwargs={'device_id': "00000000-00000000-00000000-00000001"})

    def setUp(self):
        super(MonitorSetupTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['Monitor']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)


    def test_setup_no_existing_monitor(self):
        mod_result = """{
                        "items": [],
                        "resultSize": "0"
                        }"""
        self.patched_get.return_value.text = mod_result
        self.patched_get.return_value.json.return_value = json.loads(mod_result)

        post_resp = """{"post": "resp"}"""
        self.patched_post.return_value.text = post_resp
        self.patched_post.return_value.json.return_value = json.loads(post_resp)

        resp = self.client.get(self.path)
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp, json.loads(post_resp))

        self.assertTrue(self.patched_get.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertTrue(self.patched_post.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertFalse(self.patched_put.called)


    def test_setup_existing_monitor(self):
        resp = self.client.get(self.path)
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp['items'][0]['monTopic'], "DataPoint/00000000-00000000-00000000-00000001")

        self.assertTrue(self.patched_get.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertFalse(self.patched_post.called)

        self.assertTrue(self.patched_put.called)
        self.assertEqual(self.patched_put.call_count, 1)

class MonitorDeviceCoreSetupTest(MockedCloudAuthenticatedTestCase):

    path = reverse('monitor_setup_devicecore')

    def setUp(self):
        super(MonitorDeviceCoreSetupTest, self).setUp()

        # Result to return
        result_text = TEST_RESPONSES['Monitor_DeviceCore']['GET']

        # Mock requests to return fake device info
        self.patched_get.return_value.text = result_text
        self.patched_get.return_value.json.return_value = json.loads(result_text)


    def test_setup_no_existing_monitor(self):
        mod_result = """{
                        "items": [],
                        "resultSize": "0"
                        }"""
        self.patched_get.return_value.text = mod_result
        self.patched_get.return_value.json.return_value = json.loads(mod_result)

        post_resp = """{"post": "resp"}"""
        self.patched_post.return_value.text = post_resp
        self.patched_post.return_value.json.return_value = json.loads(post_resp)

        resp = self.client.get(self.path)
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp, json.loads(post_resp))

        self.assertTrue(self.patched_get.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertTrue(self.patched_post.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertFalse(self.patched_put.called)


    def test_setup_existing_monitor(self):
        resp = self.client.get(self.path)
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp['items'][0]['monTopic'], "DeviceCore")

        self.assertTrue(self.patched_get.called)
        self.assertEqual(self.patched_get.call_count, 1)

        self.assertFalse(self.patched_post.called)

        self.assertTrue(self.patched_put.called)
        self.assertEqual(self.patched_put.call_count, 1)


# ******************************
#            Sockets
# ******************************

class MockSocketIOServer(object):
    """Mock a SocketIO server"""

    def __init__(self, *args, **kwargs):
        self.sockets = {}

    def get_socket(self, socket_id=''):
        return self.sockets.get(socket_id)


class MockSocket(Socket):
    pass


class DeviceNamespaceTest(TestCase):

    def setUp(self):
        server = MockSocketIOServer()
        self.environ = {}
        socket = MockSocket(server, {})
        socket.error = MagicMock()
        self.environ['socketio'] = socket
        self.ns = DeviceDataNamespace(
            self.environ,
            '/device'
        )

    def test_unauthenticated_event(self):
        pkt = {'type': 'event',
               'name': 'startmonitoringdevice',
               'endpoint': '/device',
               'args': ['test_device']}

        self.ns.process_packet(pkt)
        assert self.environ['socketio'].error.called

# ******************************
#            API Browser
# ******************************
class ApiBrowserTest(TestCase):

    def api_root_get_test(self):
        resp = self.client.get(reverse('api_root'))
        self.assertEqual(resp.status_code, 200)


# ******************************
#            Util functions
# ******************************
class UtilModuleTest(TestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def test_get_credentials_no_cloud(self):
        request = self.factory.get('url')
        request.META['HTTP_AUTHORIZATION'] = 'Basic ' + base64.b64encode('user:pass')
        user, password, cloud = util.get_credentials(request)
        self.assertEqual(user, 'user')
        self.assertEqual(password, 'pass')
        self.assertEqual(cloud, settings.LIB_DIGI_DEVICECLOUD['DEFAULT_CLOUD_SERVER'])

    def test_get_credentials_with_cloud(self):
        request = self.factory.get('url')
        usercloud= settings.LIB_DIGI_DEVICECLOUD['USERNAME_CLOUD_DELIMETER'].join(['user', 'custom_cloud'])
        request.META['HTTP_AUTHORIZATION'] = 'Basic ' + base64.b64encode(':'.join([usercloud, 'pass']))
        user, password, cloud = util.get_credentials(request)
        self.assertEqual(user, 'user')
        self.assertEqual(password, 'pass')
        self.assertEqual(cloud, 'custom_cloud')

    def test_key_search(self):
        d = {'a': {'deeply': {'nested': {'dict': {'key': 'value'}}}}}
        self.assertTrue(util.is_key_in_nested_dict(d, 'nested'))
        self.assertFalse(util.is_key_in_nested_dict(d, 'nope'))
