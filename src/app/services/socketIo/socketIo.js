/*
 * Angular service to wrap SocketIO functionality
 * for the XBee Wi-Fi Cloud Application Kit.
 * Based on:
 *
 * angular-socket-io v0.2.0
 * (c) 2013 Brian Ford http://briantford.com
 * License: MIT
 *
 * Changes:
 * - turned "socket" into a service within the XBeeWiFiApp rather than a
 *   stand-alone provider in a separate module
 * - removed "forward" method
 */

'use strict';

angular.module('XBeeWiFiApp')
    .service('socket', function ($rootScope, $timeout, $log) {
        var socket = io.connect('/device', {'transports': ['xhr-polling']});

        window.onbeforeunload = function () {
            $log.log("Disconnecting socket.io");
            socket.disconnect();
        }

        socket.on('connect', function () {
            $log.log("Connected via socket.io!");
        })

        var asyncAngularify = function (callback) {
            return function () {
                var args = arguments;
                $timeout(function () {
                    callback.apply(socket, args);
                }, 0);
            };
        };

        var addListener = function (eventName, callback) {
            socket.on(eventName, asyncAngularify(callback));
        };

        var wrappedSocket = {
            on: addListener,
            addListener: addListener,

            emit: function (eventName, data, callback) {
                if (callback) {
                    socket.emit(eventName, data, asyncAngularify(callback));
                } else {
                    socket.emit(eventName, data);
                }
            },

            removeListener: function () {
                var args = arguments;
                return socket.removeListener.apply(socket, args);
            }
        };

        return wrappedSocket;
    });
