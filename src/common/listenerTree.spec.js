/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe('Class: ListenerTree', function () {
    var tree, spy, scope;

    beforeEach(function () {
        var log;

        scope = {
            $$phase: null,
            $apply: function (fn) { fn(); }
        }
        log = {
            error: _.bind(console.error, console)
        }
        spy = jasmine.createSpy("ListenerTree callback");
        tree = new ListenerTree(scope, log);
    });

    it('should start out empty', function () {
        expect(tree.tree).toEqual({});
    });

    it('should register listeners correctly', function () {
        tree.on("a", "b", spy);

        expect(tree.tree.a).toBeDefined();
        expect(tree.tree.a.b).toBeDefined();
        //expect(tree.tree.a.b.listeners).toContain(spy);
        expect(tree.tree.a.b.listeners).toEqual([spy]);
        expect(tree.tree.a.b.last_value).toBe(null);

        tree.on("a", "c", spy);
        expect(tree.tree.a.c).toBeDefined();
        expect(tree.tree.a.c.listeners).toEqual([spy]);

        tree.on("a", "b", spy);
        expect(tree.tree.a.b.listeners).toEqual([spy, spy]);
    });

    it('should call listeners correctly, calling $apply', function () {
        spyOn(scope, '$apply').andCallThrough();
        tree.on("a", "b", spy);

        // Adding a listener shouldn't call $apply
        expect(scope.$apply).not.toHaveBeenCalled();

        tree.trigger("a", "b", 10);
        expect(spy).toHaveBeenCalledWith(10, null, "a", "b");
        // Since $$phase is null, we expect to have to call $apply()
        expect(scope.$apply).toHaveBeenCalled();
        scope.$apply.reset();
        spy.reset();

        tree.trigger("a", "b", 15);
        expect(spy).toHaveBeenCalledWith(15, 10, "a", "b");
        expect(scope.$apply).toHaveBeenCalled();
        scope.$apply.reset();
        spy.reset();

        tree.trigger("a", "c", "unimportant");
        // We wouldn't expect an $apply call when there are no listeners
        expect(scope.$apply).not.toHaveBeenCalled();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should call listeners correctly, calling $apply', function () {
        spyOn(scope, '$apply').andCallThrough();
        scope.$$phase = "something other than null";
        tree.on("a", "b", spy);

        // Adding a listener shouldn't call $apply
        expect(scope.$apply).not.toHaveBeenCalled();

        tree.trigger("a", "b", 10);
        expect(spy).toHaveBeenCalledWith(10, null, "a", "b");
        // Since $$phase is not null, we expect not to call $apply()
        expect(scope.$apply).not.toHaveBeenCalled();
        spy.reset();

        tree.trigger("a", "b", 15);
        expect(spy).toHaveBeenCalledWith(15, 10, "a", "b");
        expect(scope.$apply).not.toHaveBeenCalled();
        spy.reset();

        tree.trigger("a", "c", "unimportant");
        // We wouldn't expect an $apply call when there are no listeners
        expect(scope.$apply).not.toHaveBeenCalled();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should return no device IDs on get_devices() when tree is empty', function () {
        expect(tree.get_devices()).toEqual([]);
    });

    it('should return correct device IDs on get_devices()', function () {
        // We use 'undefined' for listeners in this test to improve the code
        // coverage that is reported. If we passed in stub functions (e.g.
        // function () {}), karma-coverage warns those functions aren't being
        // called. We don't intend for these listeners to be called anyway.

        tree.on("a", "b", undefined);
        tree.on("a", "c", undefined);
        // Add device "b" to tree, remove the listener
        var remove = tree.on("b", "a", undefined);
        remove();

        tree.on("c", "a", undefined);

        // Use _.sortBy to sort the result of tree.get_devices() in natural
        // order
        expect(_.sortBy(tree.get_devices())).toEqual(["a", "c"]);
    });
});
