XBee Wi-Fi Cloud Kit
===================

The XBee Wi-Fi Cloud Kit helps users quickly connect XBee Wi-Fi enabled devices
to the Internet of Things. This is the source code for the web application for
the XBee Wi-Fi Cloud Kit. This source has been
contributed by [Digi International][Digi].

  * The web application allows the user to quickly create a dashboard of widgets
    to communicate with and control their XBee Wi-Fi Cloud Kit.

  * With this source code, you can run your own instance of the application in
    Heroku, and customize it to your needs, including creating new types of
    widgets and extending the application's functionality.

See the [changelog](./CHANGELOG.md) for a summary of changes made in each
release.

[Digi]: http://www.digi.com

Support and Contributing
------------------------

Contributions to the project are very welcome. Please submit any issues you
find to the [GitHub issue tracker][issues]. If you have a change you would like
to have included in the application, please submit a pull request against the
`develop` branch.

Application code on the `master` branch is of release quality and has been
code-reviewed and quality tested at the time of release. Any code added to the
repository between official releases can be found on the `develop` branch; code
on this branch has been code-reviewed but has not necessarily been fully
tested - use this at your own discretion.

[issues]: https://github.com/digidotcom/xbeewificloudkit/issues

---

Requirements
------------

### Before you continue

These Requirements and Installations sections detail the instructions to set up
your computer for complete local development of the Cloud Kit. This is only
necessary if you wish to edit, recompile, and run the Cloud Kit application
locally on your computer. If you do not need to run the application locally,
Digi recommends that you use the following workflow:

  * Follow the instructions under 'App setup for Heroku' below, to create a
    Heroku application and add a Git remote for it
  * Edit the application source code locally
  * Use `git commit` to commit your changes
  * Use `git push heroku master` to deploy your changes to the Heroku
    application
  * Continue editing, committing, and pushing as necessary

This workflow will be slower than if you run the application locally on your
machine, but it will help avoid any compatibility issues with installing all
the required programs and dependencies on your computer.

If you are using a Windows PC and wish to develop locally, skip ahead to the
"Windows" heading under "Installation" below.


### Required programs

This application should run in Linux and Mac OS X, provided the
necessary programs are installed.  These are:

  * The [Heroku Toolbelt][toolbelt]

  * [Python 2.7.6][py27]

  * [node.js][node]

[toolbelt]: http://toolbelt.herokuapp.com/
[py27]: http://www.python.org/download/releases/2.7.6/
[node]: http://nodejs.org/

Installing node.js will also install NPM, node.js's package manager. Using NPM,
install [Grunt][grunt] and [Bower][bower]:

    $ npm install -g grunt-cli
    $ npm install -g bower

Install [pip][pip], the Python package manager, to handle the installation of
the application's Python dependencies.

[grunt]: http://gruntjs.com
[bower]: https://github.com/bower/bower
[pip]: http://www.pip-installer.org/en/latest/installing.html

Installation
------------

### Linux and Mac OS

Once you have checked out the source code from Git, and you have completed
installing the required programs (see "Requirements" above), navigate to the
root directory of the code and run the following commands:

    $ pip install -r requirements.txt
    $ npm install

This will download and install the Python modules and libraries needed by the
Django backend, and install all Node modules required for developing the
front-end application.
This installation process will also use Bower to download the necessary
front-end dependencies, and use Grunt to build the code (as part of the
post-install process of `npm install`).


### Windows

If you want to be able to build and run the XBee Wi-Fi Cloud Kit app from a
Windows machine, you will need to install the following programs:

  * [VirtualBox][vbox]
  * [Vagrant][vagrant]
  * [Git][git]
  * [NodeJS][node]

[vbox]: https://www.virtualbox.org/wiki/Downloads
[vagrant]: http://www.vagrantup.com/downloads.html
[git]: http://git-scm.com
[node]: http://nodejs.org/

(If you have already installed Git on your PC, ensure that the `git` command is
available from the Command Prompt. If it is not, add it to your PATH using the
same instructions as the "Add the VirtualBox utilities to your PATH"
instructions below; on a 32-bit PC, this should be `C:\Program Files\Git\bin`,
and on a 64-bit PC, this should be `C:\Program Files (x86)\Git\bin`.)

Once you have these programs installed, follow these steps:

  1. Add the VirtualBox utilities to your PATH. This is required so that
     Vagrant can work properly.

      * Open the Start Menu, right-click on 'Computer', and click 'Properties'.
      * Click 'Advanced system settings' on the left side of the window.
      * Click the "Environment Variables..." button.
      * In the 'System variables' table, double-click on 'Path'.
      * Append the installation path of VirtualBox to the 'Variable value'
        field. By default, this will be `C:\Program Files\Oracle\VirtualBox`
        (on both 32-bit and 64-bit PCs).

            <current value>;C:\Program Files\Oracle\VirtualBox

  1. Check out the XBee Wi-Fi Cloud Kit source code from GitHub (if you
      haven't already). To do so, open a Command Prompt and enter the following
      command:

          git clone https://github.com/digidotcom/xbeewificloudkit

  1. Open a Command Prompt, and change directories to the root directory of
      the source code.

          C:\Users\username> cd xbeewificloudkit
          C:\Users\username\xbeewificloudkit>

  1. Run the command `npm install`. This will install the Node modules
      required by the application. (This needs to be done from Windows because
      Windows has a limit on file path lengths, and running `npm install`
      inside of the Vagrant box (see the next step) will usually fail.)

  1. Run the command `vagrant up`, to automatically provision a new
      VirtualBox machine and set it up for Cloud Kit development. This process
      will take several minutes.

  1. The virtual machine created in the previous step should now be
      accessible through a small screen. Log in as the user `vagrant` (with
      the password `vagrant`), change to the `/vagrant` directory, and run
      `foreman start`. The Cloud Kit application should now be accessible from
      your Windows machine by opening http://localhost:5000 in a web browser.

          vagrant@precise32:~$ cd /vagrant
          vagrant@precise32:/vagrant$ foreman start
          12:00:00 web.1  | started with pid 5678

The root directory of the source code you checked out is shared with the
Vagrant box as the `/vagrant` directory. This means that you can edit the
source code from Windows as well as from within the Vagrant machine. When you
are ready to re-compile the application, stop Foreman by typing Ctrl-C, run
`grunt build`, and then run `foreman start` again.


App setup for Heroku
--------------------------------

## Heroku setup

Deploying a version of this application for your own use requires a [Heroku
account][heroku] and the [Heroku command line toolbelt][heroku_dev]. (If you
are using Windows and have followed the instructions above, the Heroku toolbelt
is already installed on the Vagrant virtual machine.)

1. Create a new Heroku app:

        $ heroku create

1.  Configure the new app to use multi-buildpacks (NodeJS & python in our case):

        $ heroku config:add BUILDPACK_URL=https://github.com/ddollar/heroku-buildpack-multi.git

1.  Add the "Heroku Postgres" addon to your app:

        $ heroku addons:add heroku-postgresql

1.  Deploy the application code to Heroku:

        $ git push heroku master

1.  Provision the database for the app:

        $ heroku run python manage.py syncdb

[heroku]: http://www.heroku.com/
[heroku_dev]: http://toolbelt.herokuapp.com/
[herokudash]: https://dashboard.heroku.com/apps

## Setup to run app locally:

First, you will need to edit the file Procfile, comment out the third line
(`web: gunicorn ...`) and uncomment the last line (`web: python ...`). (If you
are using Windows and have followed the instructions above, the Procfile has
already been edited, and you can skip the "Provision the database" step below.)

1. Run the grunt build

        $ grunt build

1. Provision the database

        $ python manage.py syncdb

1. Start the back-end server

        $ foreman start

foreman should be included with the [Heroku Toolbelt][heroku_dev]
[heroku_dev]: http://toolbelt.herokuapp.com/

---

XBee Wi-Fi Cloud Kit (Front-end)
=========

To enable more rapid development, the front-end application can be easily hosted
on a local computer. This front-end shell will communicate with the back-end
server which has been previously deployed to Heroku.

## Getting started

If you followed the steps in 'Installation' above, you should be ready to
develop and build the front-end source code.
Running `npm install` should have automatically run `bower install`, which will
download the dependencies of the application
([Bootstrap](http://getbootstrap.com), [jQuery](http://jquery.com), etc).
Check that `bower install` was run by examining the contents of the `vendor/`
directory; if it does not contain such subdirectories as `bootstrap`, `raphael`,
and `angular`, you will need to run the `bower install` command again.

Run `grunt build` to gather all the necessary files into the build/ directory
and run unit tests. Run `grunt build-notest` to gather the files without running
unit tests.

See "Setup to run app locally" above, and the "Running locally" section toward
the bottom of this document, for information on how to run the Django back-end
locally on your computer.


## Application structure

The application front-end is built off of Josh David Miller's
[ng-boilerplate](http://bit.ly/ngBoilerplate) project template.

#### Widgets

Widgets in the `/src/app/widgets` are considered "built-in" widgets. Additional
widgets should be placed in `/src/common/widgets`. In general, widgets have a
template, a controller, and a set of unit tests. Most widgets with a heavy UI
component have their UI abstracted into a directive in the
`/src/common/directives` folder. Generally, a widget's controller should be
responsible for handling data updates, while the directive should be responsible
for how the UI responds to those updates. The widget's template usually just has
a single HTML element that instantiates the proper directive.

#### Services

Services in the `/src/app/services/` directory are accessible by all parts of
the application, and are useful for calculations and data that need to be
accessible in multiple places. Creating a new widget generally won't involve
creating a new service.

#### Controllers

Most controllers in the application are paired with their respective templates.
Again, controllers are used to handle what application logic should occur when
data is received either from the device or from user input.

#### Directives

Directives should control how the application UI reacts to user input or new
data from the device. Directives for widget UI elements exist in
`/src/common/directives`. Directives for different pages of the application
(such as widget\_settings) exist with the other code in their respective page's
directory.

#### Unit Tests

Jasmine unit tests are differentiated by ending in `.spec.js`. The build system
is able to differentiate unit tests from application files in this manner, which
allows unit tests to exist right next to the tested code. Theoretically, all
application code should have a unit test.

<br>

## Widgets

Dashboard widgets are loaded from the back-end server via the
/api/dashboards API. This is an example of a simple dashboard widget model:

    {
        device: "00000000-00000000-00409DFF-FF111111",
        id: "widget_1234567",
        type: "switch",
        label: "Switch #1",
        sets: "DIO/3"
    }

This widget model is used by the Cloud Kit application to generate a switch
widget, labeled "Switch #1", which can be used to set the state of DIO3 on
the device 00000000-00000000-00409DFF-FF111111.

The precise fields required on a widget model will vary depending on the type
specified, but every widget must specify the following four fields:

- `id`: string used to uniquely identify the widget
- `device`: ID of the device this widget is associated with (specifically, this
  device ID is used in conjunction with any stream/pin settings to map input
and output to/from the correct device)
- `type`: widget type key, specifying what type of widget to render
- `label`: string label to display at the top of the widget

See [Widget Settings API](#widget-settings-api) for more details on widget
settings.

### Built-In Widget Types

The XBee Wi-Fi Cloud Kit application is designed to be extensible, and to make
it very easy for the user to create their own custom widget types. We have,
however, provided a small set of built-in, generic widgets, to provide insight
into widget design and as a starting point for your dashboard.

The following widget types are provided with the Cloud Kit application:

- __Gauge Widget__ (`gauge`): draws a circular, speedometer-like gauge, to
  render the value of a datastream between a low and high value. See
  [JustGage](http://justgage.com)
    - "Units" (`units`): String label for gauge to display the units of the
      values
    - "Input Transform" (`transform`): See [data transforms](#data-transforms)
    - "Low value" (`low`): Number value, the low end of the gauge
    - "High value" (`high`): Number value, the high end of the gauge. Must be
      greater than the low value

- __Line Graph Widget__ (`line-graph`): draws data in a chronological line graph.
    See [FlotCharts](http://www.flotcharts.org)
    - "Input Transform" (`transform`): See [data transforms](#data-transforms)
    - "Color" (`color`): the color used for the dots and lines in the chart. Must
        be a valid CSS color (hex, RGB, or name)
    - "Timespan" (`timespan`): the range of time, in seconds, to display in the
        graph
    - "X-axis tick size" (`ticksize`): the spacing, in seconds, between ticks/lines
        drawn along the X-axis of the chart

- __On/Off Display Widget__ (`on-off`): Displays the value of a digital input.
    - "Invert Values" (`invert`): checkbox - if checked, "On" is
      displayed for a zero value and "Off" for 1.

- __On/Off Switch Widget__ (`switch`): presents a flip-switch widget
    to toggle values on/off
    - "Invert Values" (`invert`): checkbox - if checked, the switch moving to "On"
        sends a 0 to the device, and "Off" sends a 1

- __Progress Bar Widgets__ (`progress`/`progress-vertical`): represents data values
    in a progress-bar view. Widget settings allow you to set the low and high values
    for the bar. Vertical and horizontal versions of the widget exist.
    - "Input Transform" (`transform`): see [data transforms](#data-transforms)
    - "Low value" (`low`): low-end value for the progress bar
    - "High value" (`high`): high-end value for the progress bar

- __Serial Data Widget__ (`serial`): presents an view for interacting with the
    serial port (UART) of the Cloud Kit board. Text sent to the board appears in
    blue and data received from the board appears in red
    - This widget has no custom options

- __Slider Widget__ (`slider`): allows the user to drag a slider to choose a value
    to set down to the device. See [jQuery UI docs](http://api.jqueryui.com/slider)
    - "PWM Output" (`pwm`): dropdown menu to select the PWM output to write to
    - "Low value" (`low`): low-end value for the slider
    - "High value" (`high`): high-end value for the slider
    - "Step Size" (`step`): slider step size (spacing between 'snaps') - default 1

- __Tilt Widget__ (`tilt`): Creates a two-dimensional display which represents
      the output of the acellerometer in the kit, similar to a two-dimensional
      bubble level.
    - "X-Axis Stream" (`stream_x`): dropdown menu to select the data stream
        represented on the X axis of the widget
    - "Y-Axis Stream" (`stream_y`): dropdown menu to select the data stream
        represented on the Y axis of the widget

- __Timeout Slider Widget__ (`timeout`): Allows the timeout to be changed for
      components of the kit which require one, such as the buzzer.
    - "Setting" (`setting`): dropdown menu to select the XBee module timeout
        setting that this widget will write to
    - "Low value" (`low`): the low-end value of the slider (see Slider Widget)
    - "High value" (`high`): the high-end value of the slider (see Slider Widget)
    - "Step Size" (`step`): slider step size (see Slider Widget)


### Creating Your Own Widgets

The XBee Wi-Fi Cloud Kit allows you to create your own widget types from
scratch. To start, open a command line and run `grunt widget`.

    <u>Running "widget" task</u>
    Widget type (e.g. led): *led*
    Type description (e.g. LED Widget): *LED Widget*
    Created new widget definition in /home/mike/xbeewifi/src/common/widgets/ledCustomWidget
    The widget type key is: led-custom
    The description of the widget is: LED Widget

After running this command and inputting the necessary information, Grunt will
generate the files for the new widget in /src/common/widgets (the exact path
can be found in Grunt's output). You can edit the widget template and directive
files there, re-build the application, and you will see the new widget type
appear in the widget type dropdown menu on the Add Widget page.

<br>
## Widget Settings API

User-configurable settings for widgets are defined within each widget type's
"registry specification" (the object passed into the call to
`widgetRegistry.put` at the bottom of the widget's associated run block). These
settings are built on the
[Revalidator](https://github.com/flatiron/revalidator#schema) API.

The following is an example of a basic widget setting definition:

    {
      key: "example",
      label: "My Example Setting",
      type: "string",
      required: false,
      "default": "Hello"
    }

- `key`: a unique name/key for this setting; used to identify this setting in a
  widget's JSON representation, and for creating the widget settings form
- `label`: a string used to label the form input associated with this setting on
  the widget settings form
- `type`: used by Revalidator to check the data type of the setting
- `required`: used by Revalidator to specify if this setting must be specified
  in the widget's JSON representation
- `default`: used by the Cloud Kit to auto-populate this setting if required is
  __false__ and no value is specified

(Note: the word 'default' __MUST__ be placed in quotes. If not, older versions
of IE will raise an error because 'default' is a reserved keyword.)


### Widget Settings Formats

By default, widget settings will be rendered (displayed) on the widget settings
page as basic text input fields. The type of input field is determined by the
`type` attribute set in the settings object:

- `string`: a basic text input, suitable for names and titles.
- `integer` or `number`: an HTML `<input type="number">`, which will display a
  number-picker on Chrome and other browsers supporting this feature. (Other
  browsers will just display a text input).
- `boolean`: a checkbox

In addition to these types of form elements, setting the `form` attribute in
the widget setting object will alter how the input is displayed. These formats
allow for more semantic form elements and more useful validation. The available
options are:

- `color`: a text input field, with a small box next to it. Input in the field
  must be a valid hex or rgb color specification, or match a name provided by
  [jQuery Color][jquery_color]. Valid colors will be displayed in the
  square; invalid colors will replace the square with a red crossed-out circle.
- `stream`: a dropdown menu, presenting all possible data streams served up by
  the XBee Wi-Fi device
- `pin`: a dropdown menu, presenting all possible streams/settings which can be
  written out to
- `pwm`: a dropdown menu, presenting all PWM outputs available
- `timeout`: a dropdown menu, presenting all XBee module settings corresponding
  to timeouts for pins

[jquery_color]: https://github.com/jquery/jquery-color#jquery-color

As an example, the following widget settings object

    {
        key: "max",
        label: "Max Value",
        type: "integer",
        required: "false",
        "default": 30,
    }

would create a form element similar to the one below:

<div>
<label> Max Value: </label>
<input type="number" name="opt" min="5" max="1800" placeholder="30">
</div>

#### Data Transforms

As noted in the Built-in Widget Types section, multiple widgets have a
`transform` setting. This setting allows incoming data to be processed with an
expression for display. The transform field is implemented using Angular.js's
`$eval` function. This function will only evaluate basic [Angular
expressions][angular_exp] without side affects, so one doesn't have to worry
about users inserting malicious code into the application.

For instance, imagine a temperature sensor that reported a number between 0
(corresponding to -40 degrees Fahrenheit) and 1023 (corresponding to 140 degrees
Fahrenheit). If a user wished to display this on a gauge widget as a meaningful
value in Fahrenheit as opposed to the less useful binary representation, they
could insert:

        x * (180/1024) - 40

in the Transform widget settings page. `x` in this expression is the value of
the incoming data.  To round this to the nearest whole number, the expression
can be put through an Angular filter:

        x * (180/1024) - 40 | number:0

Here `number:0` means "show as a number with 0 decimal places." Note that
because this field doesn't evaluate real JavaScript,

        Math.round((x*180/1024)-40)

 will not work correctly.

[angular_exp]: http://docs.angularjs.org/guide/expression


---

XBee Wi-Fi Cloud Kit (Back-end)
=========
The application backend is written in [Python](http://www.python.org/), using
the [Django](https://www.djangoproject.com/) web framework. Most users looking
to extend the dashboard with new widgets should have no need to modify this
code. However, advanced users may wish to extend the API with new functionality
or do local debugging alongside frontend changes.

The backend was designed to be relatively light-weight, largly wrapping existing
 [Device Cloud](http://www.etherios.com/products/devicecloud/) Web Services for
 use by the frontend. Users looking to extend or modify the API should first
 familizarize themselves with the Device Cloud features and API (documentation
 available [here](http://www.etherios.com/products/devicecloud/support/).
 Between these APIs and the frontend, the backend layer adds some simple
 persistence for dashboards, user authentication and session handling, and a
 channel for new data from Device Cloud to travel through down to the frontend
 client over a WebSocket connection.

## Getting started on Heroku

As part of the application setup, a number of configuration related environment
variables are checked (see [settings.py](./xbeewifiapp/settings.py)).

**The following are required to run the application:**
- `DATABASE_URL`: *Should* be set automatically by heroku during initial
deployment, as part of the postgres addon. If not, once the Heroku Postgres
(or other db layer) addon is attached, this variable can by set by running

        heroku pg:promote <FULL_DB_URL>
See [Heroku Documentation](https://devcenter.heroku.com/articles/heroku-postgresql#establish-primary-db) for more details

**The following should be used to set once before deployment**

Secret, unique security keys and credentials for your app:

- `DJANGO_SECRET_KEY`: Random 50 character string. Randomly generated if not found.
- `AES_CRYPTO_KEY_HEX`: Random 16 Bytes, represented as string of 32 hex characters.
Used for extra encrypting of various things. Randomly generated if not found.

The following are used to customize the basic authentication credentials used by
Device Cloud when pushing monitor events to the server:

- `DEVICE_CLOUD_MONITOR_AUTH_USER`: Username. Defaults to "change" if not found.
- `DEVICE_CLOUD_MONITOR_AUTH_PASS`: Password. Defaults to "me" if not found.

**The following are useful for debugging and local development, and may be
changed at any time:**

- `ON_HEROKU`: If set to true, Django will connect to DATABASE_URL and serve
  the application over HTTPS; otherwise, Django will use a local sqlite3
  database and use HTTP. (The Django settings file will detect the Heroku
  environment and override this value to True when deployed to Heroku.
  Otherwise, the value is set to False.)

- `DJANGO_DEBUG`: Used to run Django in debug mode (see
  [documentation](https://docs.djangoproject.com/en/dev/ref/settings/#debug)).
  Defaults to the opposite of `ON_HEROKU`.

## Exploring the API

The Backend incorporates an interactive API explorer which can be used to browse
the API resources and try out the calls made by the frontend. To get started,
navigate to /api from the root of the site (ex https://xbeewifi.herokuapp.com/api)

Much of the API is locked down to only authenticated users. If you are not
already logged in via the main site, you may login/logout via a link in the
upper-right corner of the page, using your Device Cloud credentials and
selecting the corresponding cloud server. Attempts to access most resources
while not authenticated will return a 403-Forbidden error.

One logged in, navigate around via the url's in each response. Each view
contains a description and other documentation related to that resource.

## Application structure

The application backend code is structured as a Django project containing a
number of django apps and plugins

### Essential 3rd party packages

A full list of dependencies can be found in [requirements.txt](./requirements.txt).
To install (assuming python and pip are installed), simply run (VirtualEnv recommended)

        pip install -r requirements.txt

##### [Django](https://www.djangoproject.com/)

The main web framework

##### [Django Rest Framework](http://django-rest-framework.org/)

The app makes heavy use of the [Django Rest Framework](http://django-rest-framework.org/)
to define and implement the API, handle authentication, and provide the browsable interface

##### [Gevent-socketio](https://github.com/abourget/gevent-socketio)

Python implmentation of Socket.IO to provide real-time communication between
browser and server

##### [dj-static](https://github.com/kennethreitz/dj-static)

Used to serve static files when running on the Heroku platform


#### Device Cloud Layer

Django extensions to support Device Cloud user models, authentication, and
wrappers around web services can be found under `xbeewifiapp\libs\digi`

#### Views

Url routing to views is done in `xbeewifiapp\urls.py`. Most view code is located
in `xbeewifiapp\apps\dashboard\views.py`. Note that most views will use the
default REST framework settings for permissions and authentication unless
annotated otherwise.

#### Data Flow

Information is retrieved from Device Cloud through a combination of querying and
 recieving push events. Most of the views defined in the API will perform an
 equivalent query against Device Cloud web services.

However, to facilitate real-time updates of sensor information, the application
creates two Device Cloud Monitors - one for device data (DataStreams), the other
 for device connectivity status (DeviceCore). These monitors will be atuomatically
  created as needed once under the account of each logged in user, and re-used
  on subsequent logins. NOTE: monitors are created pointing to the address that
  users see when interacting with your site. If the application is accessable
  via multiple routes or urls, it may lead to duplicate monitors created under
  the same user. Note too that monitors won't be created for urls such as localhost.


## Running locally

Local development is relatively simple to get started with. Users have a few
options, see the file `Procfile` for some possibilities, users may wish to
emulate the Heroku environment by running with Foreman

      foreman start

Or in the simplest case, with dependencies installed via pip, simply run Django
 directly:

      python manage.py runserver_socketio "0.0.0.0:5000"

Note: users running the app for the first time will still need to provision the
local database (defined in settings.py or via `DATABASE_URL` environment variable)

      python manage.py syncdb

## Running on Heroku

### Addons

When the addon is deployed on the Heroku platform, there are a number of addons
users may find useful for monitoring and debug purposes. These may be attached
to your app via the Heroku [Addons Page](https://addons.heroku.com), and have
free tiers suitable for development use:

- `Heroku Scheduler`: If your application will be supporting many users, it may
be necessary to clean up old sessions periodically. A Django command to do this
can be scheduled daily by adding the task `python manage.py clearsessions`

- `New Relic`: Useful for monitoring performance characteristics and
availablility of the application. NOTE: when running with New Relic agent, a
different command is used in the Procfile. You will need to uncomment the second
line (`web: newrelic-admin ...`) and comment out the third line
(`web: gunicorn ...`)

- `Papertrail`: Log management, archive, and search

---

License
-------

This software is open-source software.  Copyright Digi International, 2014.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
