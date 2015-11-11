#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

import os
import dj_database_url
import binascii
import random
import sys

# Detect if we're in unit test mode
TESTING = 'test' in sys.argv

# Detect if we're running on Heroku
ON_HEROKU = 'DYNO' in os.environ and os.environ.get('HOME', "").startswith("/app")

# Django settings for xbeewifiapp project.

# By default, turn DEBUG off when running on Heroku
DEBUG = bool(os.environ.get('DJANGO_DEBUG', (not ON_HEROKU)))
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES = {}
if not ON_HEROKU:
    DATABASES['default'] = {
        # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'local.sqlite'),  # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': '',
        'PASSWORD': '',
        # Empty for localhost through domain sockets or '127.0.0.1' for
        # localhost through TCP.
        'HOST': '',
        'PORT': '',  # Set to empty string for default.
    }
else:
    # Parse database configuration from $DATABASE_URL
    DATABASES['default'] = dj_database_url.config()

    # Since the database is mostly reads (writes only performed for updating
    # dashboards, session data and user info), setting autocommit will keep the
    # overhead down.
    DATABASES['default']['OPTIONS'] = {
        'autocommit': True
    }


# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = 'staticfiles'

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static'),
)
frontend_files_path = os.path.join(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'prod'),
    'static')
if os.path.exists(frontend_files_path):
    STATICFILES_DIRS = STATICFILES_DIRS + (frontend_files_path, )

frontend_files_path_dev = os.path.join(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'build'),
    'static')
if os.path.exists(frontend_files_path_dev):
    STATICFILES_DIRS = STATICFILES_DIRS + (frontend_files_path_dev, )

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    #'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    #'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'log_request_id.middleware.RequestIDMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'xbeewifiapp.apps.dashboard.middleware.DisableCSRF',
    'xbeewifiapp.apps.dashboard.middleware.NoCacheApiMiddleware'
)

# If we're on Heroku (or not in unit test mode), force SSL. Needs to be first.
if ON_HEROKU or not TESTING:
    force_ssl = ('sslify.middleware.SSLifyMiddleware',)
    MIDDLEWARE_CLASSES = force_ssl + MIDDLEWARE_CLASSES

ROOT_URLCONF = 'xbeewifiapp.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'xbeewifiapp.wsgi.application'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or
    # "C:/www/django/templates". Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), 'templates'),
)
if os.path.exists(frontend_files_path):
    TEMPLATE_DIRS = TEMPLATE_DIRS + (frontend_files_path, )
if os.path.exists(frontend_files_path_dev):
    TEMPLATE_DIRS = TEMPLATE_DIRS + (frontend_files_path_dev, )

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Uncomment the next line to enable the admin:
    # 'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    'corsheaders',
    'rest_framework',
    'xbeewifiapp.apps.dashboard',
    'xbeewifiapp.libs.digi',
)

# logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '%(levelname)s: %(message)s'
        },
        'verbose': {
            'format': '%(levelname)s [thread: %(thread)d, %(module)s:%(funcName)s, request: %(request_id)s]: %(message)s'
        }
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'request_id': {
            '()': 'log_request_id.filters.RequestIDFilter'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
            # DEBUG: Turn on verbose logging
            #'filters': ['request_id'],
            #'formatter': 'verbose'
        },
        'null': {
            'level': 'DEBUG',
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'xbeewifiapp': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    }
}
# Disable output for unit test mode
if TESTING:
    LOGGING['loggers']['xbeewifiapp']['handlers'] = ['null']

VERBOSE_LOGGING = bool(os.environ.get('VERBOSE_LOGGING', False))
if VERBOSE_LOGGING:
    # DEBUG: Log all requests
    LOG_REQUESTS=True

    LOGGING['handlers']['console']['formatter'] = 'verbose'
    LOGGING['handlers']['console']['filters'] = ['request_id']

# Honor the 'X-Forwarded-Proto' header for request.is_secure()
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Allow all host headers
ALLOWED_HOSTS = ['*']

REST_FRAMEWORK = {
    # Use hyperlinked styles by default.
    # Only used if the `serializer_class` attribute is not set on a view.
    'DEFAULT_MODEL_SERIALIZER_CLASS':
    'rest_framework.serializers.HyperlinkedModelSerializer',

    # Global default of read only unless authenticated. May be overridden or
    # tightened further by individual views, but global default needed for
    # api_root
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated'
    ],

    # Only allow api access to authenticated clients
    # Note: Order matters here. Listing session auth first will return 403's
    # for # Unauthenticated requests, vs 401 (which may lead to browser popup)
    # if basic auth
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # Normal application flow and API browser will want to use session auth
        'rest_framework.authentication.SessionAuthentication',
        # Basic auth used primarily for standalone API testing
        'rest_framework.authentication.BasicAuthentication',
    ),

    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
    ),

    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

LIB_DIGI_DEVICECLOUD = {
    # Use '#' as delimeter to parse username/cloud combo strings
    'USERNAME_CLOUD_DELIMETER': '#',
    # Set a default cloud fdqn if not provided
    'DEFAULT_CLOUD_SERVER': 'devicecloud.digi.com',
}

# Custom authentication backend for Device Cloud
AUTHENTICATION_BACKENDS = ('xbeewifiapp.libs.digi.auth.DeviceCloudBackend',)

# Custom Django user model
AUTH_USER_MODEL = 'digi.DeviceCloudUser'

# Redirect path for 'login_required'
LOGIN_URL = '/#/login'

# Redirect path for logouts
LOGOUT_URL = 'logout'

# Redirect after login if 'next' not specified
LOGIN_REDIRECT_URL = 'dashboard'

# Username/Password used for Device Cloud http monitors
SECRET_DEVICE_CLOUD_MONITOR_AUTH_USER = \
    os.environ.get('DEVICE_CLOUD_MONITOR_AUTH_USER', "change")
SECRET_DEVICE_CLOUD_MONITOR_AUTH_PASS = \
    os.environ.get('DEVICE_CLOUD_MONITOR_AUTH_PASS', "me")

# Supported Device Types (dpDeviceType) visible to frontend.
# Will be used to filter Device Cloud queries
SUPPORTED_DEVICE_TYPES = [
    'XBee WiFi S6B TH', 'XBee WiFi S6B SMT']

# Django Secret Key
try:
    SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
except KeyError:
    # Generate a new key for them using same method as
    # django-admin startproject
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)'
    SECRET_KEY = ''.join([random.choice(chars) for i in range(50)])
    os.environ['DJANGO_SECRET_KEY'] = SECRET_KEY

# Crypto key used for encryption
try:
    SECRET_CRYPTO_KEY = binascii.a2b_hex(os.environ['AES_CRYPTO_KEY_HEX'])
except KeyError:
    # Generate a new key, 16 Bytes, stored as 32 char hex string
    SECRET_CRYPTO_KEY = binascii.b2a_hex(os.urandom(16))
    os.environ['AES_CRYPTO_KEY_HEX'] = SECRET_CRYPTO_KEY

# Tell Django to use the JUXD Test Suite Runner
TEST_RUNNER = 'juxd.JUXDTestSuiteRunner'
# Where to write the output
JUXD_FILENAME = os.path.join(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'test-reports'),
    'backend.xml')
