<a name="xbeewifi-1.1"></a>
# 1.1.0.0 - released September 2015

## Changes

- Added Vagrantfile, making it easier to run the application locally using
  [Vagrant][vagrant].
- Added a new [widget tutorial document][tutorial].
- Added support for surface-mount XBee Wi-Fi modules (XBee Wi-Fi SMT).
- Added a new Advanced Options page, where the user may delete their current
  dashboard.
- Errors in setting up an HTTP push monitor in Device Cloud will now be visible
  in an error notification within the app.
- Device and widget type lists now utilize [select2][select2] functionality to
  make it easier to select devices, etc.
- The MAC address field in the "Add New Device" dialog is now pre-filled with
  Digi's prefix (`00409D`).
- Added a setting to the Serial Terminal widget to control adding a carriage
  return to input text.

## Bug Fixes

- The initial 1.0 release of the application was not compatible with Heroku's
  [cedar-14][cedar-14] stack. Version 1.1 includes updated Python dependencies
  which are compatible with cedar-14.
- Use pgbouncer-stunnel buildpack so that all database connections are
  multiplexed over one socket, reducing the actual connection count to Heroku
  Postgres and avoiding limit issues.
- Fixed issue where widget dimensions in the dashboard would occasionally
  become corrupted.

## Breaking Changes

- Dropped support for IE8.
- Removed the "read-only" option from the On/Off Switch Widget, and introduced
  the new On/Off Display Widget.
    - New users of the application, or existing users who create a new
      dashboard, will not be affected by this change. With this change,
      all existing switch widgets will be read-write (meaning you can click the
      switch and change the I/O state of that pin). Read-only behavior is
      provided by the On/Off Display Widget.


[vagrant]: https://www.vagrantup.com
[tutorial]: ./widget_tutorial.md
[select2]: https://select2.github.io/examples.html
[cedar-14]: https://devcenter.heroku.com/articles/cedar-14-migration


<a name="xbeewifi-1.0"></a>
# 1.0.0.0 - released November 2013

Initial open-source release of the XBee Wi-Fi Cloud Kit application.
