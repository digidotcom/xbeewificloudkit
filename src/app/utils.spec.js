/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Service: utils", function() {
    // Load module
    beforeEach(module("XBeeWiFiApp"));

    var utils, defs, rootscope, titleService, dataStreams;
    beforeEach(inject(function (_utils_, _$rootScope_, _titleService_, _dataStreams_) {
        utils = _utils_;
        rootscope = _$rootScope_;
        titleService = _titleService_;
        dataStreams = _dataStreams_;

        // A few example widget definitions.
        var definition_no_io = {
            size: [2, 2],
            directive: "example",
            directive_c: "example",
            has_input: false,
            sends_output: false,
            options: [
                {key: "test", label: "Test", required: false, type: "string",
                 "default": "1123"}
            ]
        }
        var definition_input = {
            size: [2, 2],
            directive: "example2",
            directive_c: "example2",
            has_input: true,
            sends_output: false,
            options: [
                {key: "test", label: "Test", required: false, type: "string",
                 "default": "1123"}
            ]
        }
        var definition_output = {
            size: [2, 2],
            directive: "example3",
            directive_c: "example3",
            has_input: false,
            sends_output: true,
            options: [
                {key: "test", label: "Test", required: false, type: "string",
                 "default": "1123"}
            ]
        }
        var definition_both = {
            size: [2, 2],
            directive: "example4",
            directive_c: "example4",
            has_input: true,
            sends_output: true,
            options: [
                {key: "test", label: "Test", required: false, type: "string",
                 "default": "1123"}
            ]
        }

        defs = {
            no_io: definition_no_io,
            input: definition_input,
            output: definition_output,
            both: definition_both
        };
    }));

    it('should have been injected?', function () {
        expect(utils).toBeDefined();
    });

    it('should create, cancel $timeout promises', function () {
        var promise = utils.timeout(function() {}, 1000);
        expect(promise).toBeDefined();

        var cancelled = utils.cancelTimeout(promise);
        expect(cancelled).toBe(true);
    });

    it('should throw an Error if an option is missing the "key" field', function () {
        var options = [
            {type: "string", label: "Option 1", required: true}
        ];

        expect(function () { utils.options_to_schema(options); }).toThrow(
            new Error("Option does not contain a 'key' property: " + JSON.stringify(options[0]))
        );
    });

    it('should correctly convert options to Revalidator schemas', function () {
        var options = [
            {key: "one", type: "string", label: "Option 1", required: true},
            {key: "two", type: "number", label: "Option 2", required: true}
        ];

        var schema = utils.options_to_schema(options);

        expect(schema).toBeDefined();
        expect(schema.properties).toBeDefined();
        expect(schema.properties.one).toBeDefined();
        expect(schema.properties.two).toBeDefined();

        expect(_.omit(schema.properties.one, "messages")).toEqual({
            type: "string",
            required: true,
            label: "Option 1"
        });
        expect(_.omit(schema.properties.two, "messages")).toEqual({
            type: "number",
            required: true,
            label: "Option 2"
        });
    });

    function verify (widget, definition) {
        return _.bind(utils.verify_widget, utils, widget, definition);
    }
    var type = "switch";

    it('should verify basic widgets properly', function () {
        var good_widget, bad_widget;
        good_widget = {
            device: "aaa", id: "widget1", label: "Widget!", type: type
        }
        expect(verify(good_widget, defs.no_io)).not.toThrow();

        bad_widget = {
            // Missing "id" key
            device: "aaa", label: "Widget", type: type, test: "aa"
        }
        expect(verify(bad_widget, defs.no_io)).toThrow();

        bad_widget = {
            // Missing "label" key
            device: "aaa", id: "Widget", type: type, test: "aa"
        }
        expect(verify(bad_widget, defs.no_io)).toThrow();

        bad_widget = {
            // Missing "type" key
            device: "aaa", id: "Widget", label: "Widget", test: "aa"
        }
        expect(verify(bad_widget, defs.no_io)).toThrow();

        bad_widget = {
            // Missing "device" key
            id: "widget1", label: "Widget", type: type, test: "aa"
        }
        expect(verify(bad_widget, defs.no_io)).toThrow();

        bad_widget = {
            id: "widget1", label: "Widget", type: type,
            test: 12 // "test" is supposed to be a string
        }
        expect(verify(bad_widget, defs.no_io)).toThrow();
    });

    it('should check for "gets" key properly', function () {
        var good_widget, bad_widget;

        good_widget = {
            id: "widget2", label: "Widget", type: type, device: "aaa",
            gets: "STREAM"
        }
        expect(verify(good_widget, defs.input)).not.toThrow();

        bad_widget = {
            // Needs "gets" key
            id: "widget2", label: "Widget", type: type, device: "aaa"
        }
        expect(verify(bad_widget, defs.input)).toThrow();
    });

    it('should check for "sets" key properly', function () {
        var good_widget, bad_widget;

        good_widget = {
            id: "widget3", label: "Widget", type: type, device: "aaa",
            sets: "STREAM"
        }
        expect(verify(good_widget, defs.output)).not.toThrow();

        bad_widget = {
            // Needs "sets" key
            id: "widget3", label: "Widget", type: type, device: "aaa"
        }
        expect(verify(bad_widget, defs.output)).toThrow();
    });

    it('should check for both "gets" and "sets"', function () {
        var good_widget, bad_widget;

        good_widget = {
            id: "widget3", label: "Widget", type: type, device: "aaa",
            sets: "STREAM", gets: "STREAM"
        }
        expect(verify(good_widget, defs.both)).not.toThrow();

        bad_widget = {
            // Needs "sets" key
            id: "widget3", label: "Widget", type: type, device: "aaa",
            gets: "STREAM"
        }
        expect(verify(bad_widget, defs.both)).toThrow();

        bad_widget = {
            // Needs "gets" key
            id: "widget3", label: "Widget", type: type, device: "aaa",
            sets: "STREAM"
        }
        expect(verify(bad_widget, defs.both)).toThrow();

        bad_widget = {
            // Needs both "gets" and "sets" keys
            id: "widget3", label: "Widget", type: type, device: "aaa"
        }
        expect(verify(bad_widget, defs.both)).toThrow();
    });

    it("should throw an error from verify_widget if revalidator is missing", function () {
        // utils.verify_widget defers to utils.validate to handle Revalidator
        // interaction. utils.validate throws an Error if Revalidator is
        // missing.
        var _revalidator = window.json;
        window.json = null;
        expect(verify({}, {})).toThrow(new Error("Revalidator was not found."));

        window.json = {notrevalidate: true};
        expect(verify({}, {})).toThrow(new Error("Revalidator was not found."));
        window.json = _revalidator;
    });

    it("should throw an error from validate if revalidator is missing", function () {
        var _revalidator = window.json;

        window.json = null;
        expect(function () { utils.validate(); }).toThrow(new Error("Revalidator was not found."));

        window.json = {notrevalidate: true};
        expect(function () { utils.validate(); }).toThrow(new Error("Revalidator was not found."));

        window.json = _revalidator;
    });

    it("should correctly find widgets using get_widget_by_id", inject(function ($httpBackend) {
        var widget1 = {id: "widget1", type: "buzzer", label: "B1"};
        var widget2 = {id: "widget2", type: "switch", label: "S1"};
        $httpBackend.whenGET('/api/dashboards').respond([{
            url: "fake-url/api/dashboards/1",
            widgets: [ widget1, widget2 ]
        }]);

        var spy = jasmine.createSpy("lookup callback");

        utils.get_widget_by_id("widget1").then(spy);
        $httpBackend.flush();
        expect(spy).toHaveBeenCalledWith(widget1);
        spy.reset();

        utils.get_widget_by_id("widget2").then(spy);
        rootscope.$apply();
        //$httpBackend.flush();
        expect(spy).toHaveBeenCalledWith(widget2);
        spy.reset();

        // _.find returns undefined when no match was found
        utils.get_widget_by_id("some other widget").then(spy);
        rootscope.$apply();
        //$httpBackend.flush();
        expect(spy).toHaveBeenCalledWith(undefined);
        spy.reset();
    }));

    it("should reject the get_widget_by_id promise on HTTP error", inject(function ($httpBackend) {
        $httpBackend.whenGET('/api/dashboards').respond(400, {}, '');

        var successCb = jasmine.createSpy("success callback");
        var failureCb = jasmine.createSpy("failure callback");

        utils.get_widget_by_id("blah").then(successCb, failureCb);
        $httpBackend.flush();

        expect(successCb).not.toHaveBeenCalled();
        expect(failureCb).toHaveBeenCalled();
    }));

    it("should call titleService.setTitle on setTitle", function () {
        spyOn(titleService, 'setTitle');
        utils.setTitle("Test Title");
        expect(titleService.setTitle).toHaveBeenCalledWith("Test Title");
    });

    it("should properly base64-decode data", function () {
        var helloworld = "SGVsbG8gV29ybGQh";
        var xbeewifi = "eGJlZXdpZmk=";

        expect(utils.base64_decode(helloworld)).toBe("Hello World!");
        expect(utils.base64_decode(xbeewifi)).toBe("xbeewifi");
        // Code coverage cases
        expect(utils.base64_decode()).toBe(undefined); // !data
        expect(utils.base64_decode("YWFhYg==")).toBe("aaab"); // h3 == 64
    });

    it("should throw an error from postlinkWidget if no definition is given", function () {
        expect(function () {
            utils.postlinkWidget("blah", {}, {}, undefined);
        }).toThrow(new Error("Widget type blah is not defined."));
    });

    it("should throw an error if has_input but no getsCB is provided", function () {
        expect(function () {
            utils.postlinkWidget("blah", {widget: {id: "a", gets: "a"}}, {}, {has_input: true});
        }).toThrow(new Error("Widget type blah receives data updates, but widget a did not provide a callback."));
    });

    it("should not throw an error if has_input and a getsCB is provided", function () {
        var callback = function () {};
        var scope = rootscope.$new();
        scope.widget = {id: "a", gets: "b", device: "d"};

        expect(function () {
            utils.postlinkWidget("blah", scope, {}, {has_input: true}, callback);
        }).not.toThrow();
    });

    it("should add a listener to dataStreams in postlinkWidget when has_input, and remove it when the scope is destroyed", function () {
        var callback = jasmine.createSpy("listener");
        var scope = rootscope.$new();
        var device = "00000000-00000000-00000000-00000000";
        scope.widget = {id: "a", gets: "stream", device: device};

        spyOn(dataStreams, 'listen').andCallThrough();
        utils.postlinkWidget("blah", scope, {}, {has_input: true}, callback);

        expect(dataStreams.listen).toHaveBeenCalledWith(device, "stream", callback);

        // Check that the getsCB was added to the data streams tree
        dataStreams.new_data({
            DataPoint: {
                streamId: device + "/stream",
                data: 0,
                timestamp: 100
            }
        });
        expect(callback).toHaveBeenCalledWith({timestamp: 100, value: 0}, null, device, "stream");

        callback.reset();

        scope.$destroy();

        // Check that the getsCB doesn't get called again
        dataStreams.new_data({
            DataPoint: {
                streamId: device + "/stream",
                data: 2,
                timestamp: 101
            }
        });
        expect(callback).not.toHaveBeenCalled();
    });

    it("should throw an error if sends_output but no setsCB/getsCB are provided", function () {
        expect(function () {
            utils.postlinkWidget("blah", {widget: {id: "a"}}, {}, {sends_output: true});
        }).toThrow(new Error("Widget type blah receives data updates, but widget a did not provide any callbacks."));
    });

    it("should not throw an error if sends_output and a getsCB is provided", function () {
        var callback = function () {};
        var scope = rootscope.$new();
        scope.widget = {id: "a", sets: "s", device: "d"};

        spyOn(dataStreams, 'listen').andCallThrough();
        spyOn(dataStreams, 'get_initial_data').andReturn(undefined);

        expect(function () {
            utils.postlinkWidget("blah", scope, {}, {sends_output: true}, callback);
        }).not.toThrow();

        expect(dataStreams.listen).toHaveBeenCalledWith("d", "s", callback);
        expect(dataStreams.get_initial_data).toHaveBeenCalledWith("d", "s");

        // Get code coverage on the $destroy listener (removing data listener)
        scope.$destroy();
    });

    it("should not throw an error if sends_output and a setsCB is provided", function () {
        var callback = function () {};
        var scope = rootscope.$new();
        scope.widget = {id: "a", sets: "s", device: "d"};

        spyOn(dataStreams, 'listen').andCallThrough();
        spyOn(dataStreams, 'get_initial_data').andReturn(undefined);

        var definition = {
            sends_output: true,
            // For branch coverage on if (!def.disable_autofetch)
            disable_autofetch: true
        };

        expect(function () {
            utils.postlinkWidget("blah", scope, {}, definition, undefined, callback);
        }).not.toThrow();

        expect(dataStreams.listen).toHaveBeenCalledWith("d", "s", callback);
        expect(dataStreams.get_initial_data).not.toHaveBeenCalled();
    });

    it("should add a listener to dataStreams in postlinkWidget when sends_output, and remove it when the scope is destroyed", function () {
        var callback = jasmine.createSpy("listener");
        var scope = rootscope.$new();
        var device = "00000000-00000000-00000000-00000000";
        scope.widget = {id: "a", sets: "stream", device: device};

        spyOn(dataStreams, 'listen').andCallThrough();
        utils.postlinkWidget("blah", scope, {}, {sends_output: true}, undefined, callback);

        expect(dataStreams.listen).toHaveBeenCalledWith(device, "stream", callback);

        // Check that the getsCB was added to the data streams tree
        dataStreams.new_data({
            DataPoint: {
                streamId: device + "/stream",
                data: 0,
                timestamp: 100
            }
        });
        expect(callback).toHaveBeenCalledWith({timestamp: 100, value: 0}, null, device, "stream");

        callback.reset();

        scope.$destroy();

        // Check that the getsCB doesn't get called again
        dataStreams.new_data({
            DataPoint: {
                streamId: device + "/stream",
                data: 2,
                timestamp: 101
            }
        });
        expect(callback).not.toHaveBeenCalled();
    });

    it("should return correct values from find_key", function () {
        var obj = {
            key1: 1,
            key2: 2,
            key3: 3,
            key4: {
                nestedKey1: 1,
                nestedKey2: {
                    nestedKey1: 0,
                    doublyNestedKey: 1
                }
            }
        };

        // Base case -- the key is top-level in the object.
        expect(utils.find_key(obj, "key1")).toEqual([obj]);
        // The key appears in multiple places in the object (only get the
        // top-most occurrence)
        expect(utils.find_key(obj, "nestedKey1")).toEqual([obj.key4]);
        // The key is nested
        expect(utils.find_key(obj, "doublyNestedKey")).toEqual([obj.key4.nestedKey2]);
    });

    it("should validate colors correctly in json.validate.formats.color", function () {
        var test = json.validate.formats.color.test;

        // Handled by color regex
        expect(test("red")).toBe(true);
        expect(test("blue")).toBe(true);
        expect(test("#CCC")).toBe(true);
        expect(test("rgb(255,255,255)")).toBe(true);

        // Exist in jQuery.Color.names
        expect(test("aliceblue")).toBe(true);

        // Not colors
        expect(test("NOTACOLOR")).toBe(false);
    });

    it("should correctly parse Angular expressions in the conform function for the base 'transform' setting", function () {
        var transform_setting;
        for (var i = 0; i < utils.io_options.length; i++) {
            // Get the transform setting safely. (We could get it by accessing
            // utils.io_options[3], for example, but that isn't safe because
            // the io_options array could change later)
            if (utils.io_options[i].key === "transform") {
                transform_setting = utils.io_options[i];
                break;
            }
        }

        expect(transform_setting).toBeDefined();

        var conformFn = transform_setting.conform;
        expect(conformFn).toBeDefined();
        expect(conformFn).toEqual(jasmine.any(Function));

        expect(conformFn("1 + 1")).toBe(true);
        expect(conformFn("-")).toBe(false);
    })
});
