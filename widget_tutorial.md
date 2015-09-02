Creating a custom widget
========================

The XBee Wi-Fi Cloud Kit makes it easy to create your own widgets from scratch.
To start, open a command line and run `grunt widget`. You will be prompted for
a widget type string, and a description. (For example, if you are making a
widget to report if the front door is open, you might enter "front-door" as the
widget type and "Front Door Widget" as the description.)

The `grunt widget` command will then generate new widget code based on your
input, and place that code in a new directory under `src/common/widgets`. In
this directory, there will be three files initially: a JavaScript file (file
extension `.js`), which contains an AngularJS
[directive](http://docs.angularjs.org/guide/directive) for the new widget; an
AngularJS HTML template (file name ending in `.tpl.html`) defining the basic
HTML for this widget; and a unit test file (file name ending in `.spec.js`)
which you can use to write [Jasmine](http://pivotal.github.io/jasmine/) unit
tests for your widget, if you wish.


# Hands-on example

Let's dive in with an example of creating a custom widget. For this example, we
will create a widget to indicate if a door is open or closed. We will assume
that you have wired a digital sensor into pin DIO8 (originally allocated to a
slide switch) on your Cloud Kit board, and that a value of 1 corresponds to the
door being open while a value of 0 means the door is closed.

## Step 1: Create the widget code

1.  Open a command prompt, and `cd` to the root directory of the Cloud Kit web
    app code.

        $ cd cloudkitapp/
        $ ls
        bower.json      changelog.tpl   LICENSE.TXT ...

1.  Run the Grunt command to generate a new widget, and answer the prompts.

    <pre>
    $ grunt widget
    <u>Running "widget" task</u>
    Widget type (e.g. led): <i>door</i>
    Type description (e.g. LED Widget): <i>Door Widget</i>
    <br />
    Created new widget definition in /home/foo/cloudkitapp/src/common/widgets/doorCustomWidget
    The widget type key is: door-custom
    The description of the widget is: Door Widget
    </pre>

You will find the newly-created widget code under the directory
`src/common/widgets/doorCustomWidget`.

## Step 2: Edit the widget template

Change directories to where the newly-created widget code resides.

    $ cd src/common/widgets/doorCustomWidget

In this directory, you will find three files:

*   `doorCustomWidget.js`: TODO describe
*   `doorCustomWidget.spec.js`: TODO describe
*   `doorCustomWidget.tpl.html`: TODO describe

First, we will edit the widget HTML template. Suppose we just want to render
some text to indicate whether the door is open or closed. As mentioned before,
we assume a value of 1 from the sensor means the door is open, and a value of 0
means it is shut.

##### Option 1: Use ng-if
One way to create this widget would be to use the
[ng-if](http://docs.angularjs.org/api/ng.directive:ngIf) directive, which
modifies the DOM based on an expression. In this case, we want to show "Door is
closed" if the value indicates the door is closed, and "Door is open"
otherwise.

Edit `doorCustomWidget.tpl.html` to have the following contents:

    <div class="widget-door-custom">
        <div style="text-align: center; width: 100%">
            <p ng-if="value == 0">Door is closed</p>
            <p ng-if="value != 0">Door is open</p>
        </div>
    </div>

##### Option 2: Use ng-show
Another way to create this widget, very similar to option 1, is to use the
[ng-show](http://docs.angularjs.org/api/ng.directive:ngShow) directive, which
makes the given HTML element visible or hidden, depending on the value of the
given expression.

Edit `doorCustomWidget.tpl.html` to have the following contents:

    <div class="widget-door-custom">
        <div style="text-align: center; width: 100%">
            <p ng-show="value == 0">Door is closed</p>
            <p ng-show="value != 0">Door is open</p>
        </div>
    </div>

(This method will be slightly more efficient than option 1, because it does not
need to destroy and recreate the DOM element each time "value" is updated, but
the difference in this case will be negligible.)

##### Option 3: Use ng-switch
Yet another option is to use the
[ng-switch](http://docs.angularjs.org/api/ng.directive:ngswitch) directive,
which can be used to conditionally swap DOM structure depending on the value of
an expression.

Edit `doorCustomWidget.tpl.html` to have the following contents:

    <div class="widget-door-custom">
        <div style="text-align: center; width: 100%" ng-switch="value">
            <p ng-switch-when="0">Door is closed</p>
            <p ng-switch-default>Door is open</p>
        </div>
    </div>

##### Option 4: Use AngularJS data binding markup and a scope function
Finally, you might choose to define a function on the widget scope which
returns different text depending on the value reported by the sensor. The first
step is to edit `doorCustomWidget.tpl.html`:


    <div class="widget-door-custom">
        <div style="text-align: center; width: 100%">
            <p>{{ get_text(value) }}</p>
        </div>
    </div>

Now the contents of the `<p>` tag will be automatically updated to reflect the
return value of the function `get_text` when it is called with `value` as an
argument.

You will need to remember to add the `get_text` function in the next step if
you chose this option.


## Step 3: Editing the widget code

The next step is to modify the widget's code to function as we need.
Edit `doorCustomWidget.js` as follows:

1.  Since we need this widget to receive data updates from Device Cloud, you
    will need to change the line `has_input: false,` to `has_input: true,`.
    This line can be found near the bottom of the file, inside the
    `widget_spec` object.

    (If you don't change `has_input` to true, then you will not see an option
    to specify the input stream for this widget, and the widget will not
    receive updates from Device Cloud.)

2.  You can delete the contents of the `options` array; this array specifies
    any custom widget settings you might want to define. (You can change it to
    `options: [ ]`)

3.  If you went with option #4 above (using a scope function to decide what
    text to display), you will need to add a `get_text` function to the
    widget's scope. Somewhere within the `linker` function defined near the top
    of `doorCustomWidget.js` (perhaps just below the `utils.postlinkWidget`
    call), add the following code:

        scope.get_text = function (value) {
            if (value == 0) {
                return "Door is closed.";
            } else {
                return "Door is open.";
            }
        };

    The logic in this function can be as complicated as you wish.

## Step 4: Testing the widget

Now that you have designed your first widget, it's time to check that it works.

Run `grunt build-notest` to "compile" the front-end application code into the
`build/static/` directory. (If you wish to run the front-end unit tests, you
can run `grunt build` instead.)

    # Change directories back to the root directory of the code
    $ cd /home/foo/cloudkitapp

    $ grunt build-notest

Next, run `foreman start` to launch the application server, and navigate to
http://localhost:5000. (This is assuming that you followed the installation
instructions in the README document, to be able to run the application server
in a local environment.)

    $ foreman start

Having opened the Cloud Kit application in your browser, log in to the
application, and if necessary, add your XBee Wi-Fi to your Device Cloud account
and create a new dashboard.

On the dashboard page, click the "Add Widget" button.

On the "Create a new Widget" page,

1.  Select "Door Widget" in the Widget Type dropdown. (If you do not see this
    option, check that you have followed the previous steps correctly, and that
    the `grunt build` or `grunt build-notest` command was successful.)

1.  Add a label to this new widget. ("My First Widget", perhaps.)

1.  Select your XBee Wi-Fi in the Device dropdown.

1.  Select DIO8 in the Input Stream dropdown. You can press the "Check Device
    Configuration" button beside the dropdown to check that the XBee Wi-Fi is
    configured to use DIO8 as a digital input.

1.  Press "Save" to add this widget to your dashboard.

You will be redirected to the dashboard page, where your widget should now be
visible. (It will likely appear toward the bottom of the page.)

Test that the widget code works by opening and closing the door, refreshing the
dashboard page each time. You should see the widget change between reading
"Door is open" and "Door is closed". (You need to refresh the page because
Device Cloud does not allow HTTP push monitors to be sent to local addresses,
and by refreshing the page, the application fetches the most recent data from
Device Cloud.)

If the widget is working, then it's time to push your new code to Heroku!

## Step 5: Updating the Heroku application

(You will need to have followed the instructions under "Heroku setup" in the
"App setup for Heroku" section of the README before this step will work. You
need a Heroku app to push code to.)

Commit the new widget code to Git:

    $ git add src/common/widgets/doorCustomWidget

    $ git commit -m "Add new door widget."

Push the updated code to Heroku:

    $ git push heroku master

Once the `git push` command completes successfully, you can open the Heroku app
in the browser, log in, and you will be able to add a door widget to your
dashboard, just like you did in step 4 above.

# Congratulations!

You just created your first XBee Wi-Fi Cloud Kit dashboard widget.

# Next steps

You can make widgets to do practically anything you want. You could...

##### Show a different image depending on the stream value

    <div class="widget-reactor-monitor">
        <div style="text-align: center; width: 100%">
            <img ng-src="/static/assets/mywidget/{{get_image(value)}}">
        </div>
    </div>

<!-- separate these two code blocks -->

    # Add this function to the widget JS file
    scope.get_image = function (value) {
        if (value < 500) {
            return "reactor_cool.jpg";
        } else if (value < 1000) {
            return "reactor_warm.jpg";
        } else {
            return "reactor_overheating.jpg";
        }
    };

Suppose you have three images, `reactor_cool.jpg`, `reactor_warm.jpg`, and
`reactor_overheating.jpg`, that you want to use to represent the state of the
nuclear reactor in your backyard. If you create a new directory under
`src/assets` named `mywidget` (you could name it anything you want - just be
sure to update the widget template accordingly) and place those three images in
that directory, then this template and corresponding widget scope function will
let you visualize how hot your nuclear reactor is.

(Note: If your images are larger than the widget, you can easily change the
dimensions of the widget by modifying the `size` attribute in the `widget_spec`
object. This is the same object where you modified `has_input`)

(P.S.: Digi does not recommend using the XBee Wi-Fi Cloud Kit to monitor your
backyard nuclear reactor.)

##### Build a widget composed of pieces of other widgets

Suppose you want to build a single widget that is composed of bits and pieces
of other built-in widgets. Luckily, that is very easy to do.

In this example, we'll build a widget that has three sliders in it. (Maybe
you're controlling a sound mixer.) Note that this widget just has the sliders;
it doesn't have text on it like the built-in slider widget.

    <div class="widget-sliders-galore">
        <div ui-slider in-value="server_values[0]" out-value="value[0]"
            min="widget.low" max="widget.high" step="widget.step"></div>
        <div ui-slider in-value="server_values[1]" out-value="value[1]"
            min="widget.low2" max="widget.high2" step="widget.step"></div>
        <div ui-slider in-value="server_values[2]" out-value="value[2]"
            min="widget.low" max="widget.high" step="widget.step"></div>
    </div>

<!-- Separate code blocks -->

    scope.server_values = [undefined, undefined, undefined];
    scope.value = [undefined, undefined, undefined];
    scope.value_fresh = [false, false, false];

    // Get initial state
    cloudKitApi.device_config(scope.widget.device, 'InputOutput',
                                {cache: "true"}).then(function (resp) {
        function get_stream(stream) {
            return resp.sci_reply.send_message.device.rci_reply.query_setting.InputOutput[stream];
        }
        _.each(["pwm1", "pwm2", "pwm3"], function (stream, index) {
            try {
                var value = get_stream(stream);
                scope.value[index] = scope.server_values[index] = parseInt(value, 16);
                scope.value_fresh[index] = true;
            } catch (e) {
                $log.error(e);
            }
        });
    });

    function maybeResetState() {
        if (scope.state === 1) {
            scope.state = 0;
        }
    }

    _.each([1, 2, 3], function (i) {
        // Based on code in slider widget JS
        scope.$watch('value[' + i + ']', function (newval, oldval) {
            if (newval === scope.server_value) {
                if (newval !== undefined && scope.value_fresh[i]) {
                    scope.value_fresh[i] = false;
                    return;
                }
                else if (newval === undefined) {
                    return;
                }
            }
            if (newval === undefined && oldval !== undefined) {
                $log.debug("Slider started being dragged...");
                if (scope.$update) {
                    utils.cancelTimeout(scope.$update);
                    scope.$update = null;
                }
                return;
            }
            else if (newval === null || newval === undefined) {
                return;
            }

            $log.debug("Slider " + i + " value updated to " + newval);
            if (scope.$update) {
                utils.cancelTimeout(scope.$update);
            }
            scope.$update = utils.timeout(function () {
                scope.state = 1;
                var s = 'pwm' + i;
                $log.debug("Setting slider " + i + ", " + scope.widget[s] + " to " + newval);
                cloudKitApi.output(scope.widget.device, scope.widget[s], newval).then(function () {
                    $log.info("Successfully set " + scope.widget[s] + ": " + newval);
                }, function () {
                    $log.error("Failed to set " + scope.widget[s], arguments);
                    notificationService.error(
                        "Failed to write setting for " + scope.widget[s],
                        "PWM setting failed");
                })['finally'](function () {
                    maybeResetState();
                });
                scope.$update = null;
            }, 1000);
        });
    });

<!-- Separate code blocks -->

    # Go down to the widget_spec object
    size: [3, 3],
    # ...
    options: [
        {key: "pwm1", type: "string", label: "PWM Output 1", required: true,
         format: "pwm"},
        {key: "pwm2", type: "string", label: "PWM Output 2", required: true,
         format: "pwm"},
        {key: "pwm3", type: "string", label: "PWM Output 3", required: true,
         format: "pwm"},
        {key: "low", type: "number", label: "Low value", required: false,
         minimum: 0, maximum: 1023, "default": 0},
        {key: "high", type: "number", label: "High value",
         required: false, minimum: 0, maximum: 1023, "default": 1023,
         dependencies: 'low', conform: function (val, obj) {
             var low = obj.low;
             return low < val;
         },
         messages: {conform: "High value must be greater than low value"}
        },
        {key: "step", type: "number", label: "Step Size", required: false,
         minimum: 1, "default": 1}
    ]

This should get you a widget with three independent sliders. (Note that the
low, high, and step values of each slider will be the same.)
