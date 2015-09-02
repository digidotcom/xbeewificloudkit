#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#
# This class implements a tree structure to hold "event listeners" in our
# application. The tree structure is as follows:
#   - Top-level: keys are device IDs, values are subtrees
#       - Subtrees: keys are stream names (e.g. "DIO/0"), values are objects
#           - Objects: each object contains these two keys:
#               listeners: array of callbacks
#               last_value: the previous value associated with this stream
#
# Using a ListenerTree object, an application can easily register 'callbacks'
# to be executed when a data stream is updated.
class ListenerTree
    constructor: (@rootscope, @log) ->
        @tree = {}

    # Used to clean up listener arrays, to improve efficiency
    defragment: (array) ->
        len = array.length
        for i in [0..len]
            if not array[i]?
                array.splice i, 1
                i--
                len--

    # Register a callback (listener) for a given data stream.
    # Returns a function which, when called, 'unregisters' the listener
    #   (removes it from the listener tree)
    on: (device, stream, listener) ->
        # create an empty object at @tree[device] if necessary
        streams = @tree[device] ?= {}
        # create an empty array at @tree[device][stream] if necessary
        leaf = streams[stream] ?= {
            last_value: null
            listeners: []
        }
        listeners = leaf.listeners
        # push the listener onto the array
        listeners.push listener
        # return the deregistering function
        tree = this  # needed for binding within deregistering function
        () ->
            index = _.indexOf listeners, listener
            listeners[index] = null

            tree.defragment listeners
            return

    # Record an updated data stream value, and call its associated listeners,
    # passing each listener the following as arguments:
    #   - new value
    #   - previous value
    #   - device ID
    #   - stream name
    trigger: (device, stream, value) ->
        if @tree[device]?[stream]?.listeners?.length
            leaf = @tree[device][stream]
            old = leaf.last_value
            leaf.last_value = value
            listeners = leaf.listeners
            @defragment listeners
            call = (listener) ->
                listener.call null, value, old, device, stream
            for listener in listeners
                try
                    if @rootscope.$$phase?
                        call listener
                    else
                        @rootscope.$apply () -> call listener
                catch error
                    @log.error error

    # Rather than naively return _.keys(devices), we search through the tree to
    # make sure to only return device IDs where there is at least one listener
    # for a stream from that device. (For example, if we used to be listening
    # to <DEVICE>/DIO/1 but have since removed that listener, we don't want to
    # return <DEVICE> from get_devices(), unless there are other streams we are
    # listening to there).
    get_devices: () ->
        devices = []
        for device in _.keys(@tree)
            found = false
            for stream in _.keys(@tree[device])
                if @tree[device][stream]?.listeners?.length
                    found = true
                    break
            if found
                devices.push device
        return devices

window.ListenerTree = ListenerTree
