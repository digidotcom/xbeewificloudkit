#!/usr/bin/env node
/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2013 Digi International Inc., All Rights Reserved.
 */

//var connect = require('connect');
var express = require('express');
var http = require('http');
var socket = require('socket.io');
var r = require('request');

var port = process.env.PORT || 3000;
console.log("Listening on port " + port);
if (process.argv.length < 3) {
    console.log("Usage: node " + process.argv[1] + " <root directory to serve>");
    process.exit(1);
}

var app = express();
var dir = process.argv[2];
var browsable = process.argv[3] || false;
var backend = "http://" + process.argv[3] + '.herokuapp.com';
app.use(express.static(dir));
if (browsable) {
    app.use(express.directory(dir));
}
//app.use(express.logger());
//app.use(express.bodyParser());
app.set('json spaces', 0);
app.get('/', function (req, res) {
    res.sendfile('./' + dir + '/static/index.html');
})
//app.get('/login', function (req, res) {
    //res.sendfile('./' + dir + '/login.html');
//});
app.get('/logout', function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + "/api/logout"}));
    res.redirect('/#/login');
});
var makeNice = function (headers) {
    headers.accept = "application/json";
}
app.post('/api/login', function (req, res) {
    makeNice(req.headers);
    req.pipe(r.post({url: backend + '/api/login'})).pipe(res);
});

app.get('/api/dashboards', function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + '/api/dashboards'})).pipe(res);
});
app.post('/api/dashboards', function (req, res) {
    makeNice(req.headers);
    req.pipe(r.post({url: backend + '/api/dashboards'})).pipe(res);
});
app.put('/api/dashboards/:board', function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + '/api/dashboards/' + req.params.board})).pipe(res);
});
app.get('/api/devices', function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + '/api/devices'})).pipe(res);
});
app.post('/api/devices', function (req, res) {
    makeNice(req.headers);
    req.pipe(r.post({url: backend + '/api/devices'})).pipe(res);
});
app.get(/^\/api\/devices\/(.*)$/, function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + '/api/devices/' + req.params[0]})).pipe(res);
});
app.put(/^\/api\/devices\/(.*)$/, function (req, res) {
    makeNice(req.headers);
    req.pipe(r.put({url: backend + '/api/devices/' + req.params[0]})).pipe(res);
});

var getAuth = function (req) {
    if (req.headers.authorization && req.headers.authorization.search("Basic ") === 0) {
        var reqheader = new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString();
        reqheader = reqheader.split(':');
        var username = reqheader[0];
        var usernameparts = username.split("#");
        return {
            username: usernameparts[0],
            cloud_fqdn: usernameparts[1],
            password: reqheader[1]
        };
    } else {
        return null;
    }
};

app.get('/api/user', function (req, res) {
    makeNice(req.headers);
    req.pipe(r({url: backend + '/api/user'})).pipe(res);
});

/**View Code route
 */
app.get('/static/:name', function(req, res) {
    if (req.params.name.indexOf(".js", req.params.name.length - 3) !== -1) {
        res.sendfile('./src/app/widgets/switchWidget/switchWidget.js');
    }
    else {
        res.sendfile('./src/app/widgets/switchWidget/switchWidget.css');
    }
});

var server = http.createServer(app);
//var server = connect.createServer(
    //connect.static(process.argv[2]));
var io = socket.listen(server);
io.set('log level', 1);
server.listen(port);

var _socket = null;
app.get('/testdata', function (req, res) {
    var stream = req.query.stream || "00000000-00000000-00000000-00000000/DIO0";
    var value = Number(req.query.value) || 0;
    io.of('/devicedata').emit('device_data', {DataPoint: {streamId: stream, data: value}});
    res.send(200);
});

io.of('/devicedata').on('connection', function (socket) {
    console.log("New socket.io!", socket.handshake.headers.cookie);
    //console.log("Connection initiated. Sending DIO1=50");
    socket.emit('device_data', {stream: "DIO1", value: 50});
    socket.on('send', function (data) {
        console.log("Received new data via 'send': ", data);
    });

    var monitoredDevices = {}
    socket.on('startmonitoringdevice', function (device) {
        if (device in monitoredDevices) {
            return;
        }
        monitoredDevices[device] = 0;
    });
    socket.on('stopmonitoringdevice', function (device) {
        if (!device in monitoredDevices) {
            return;
        }
        delete monitoredDevices[device];
    });

    var doSend = false;
    var lastVal = null;
    socket.on('start loop', function () {
        lastVal = null;
        doSend = true;
    });
    socket.on('stop loop', function () {
        doSend = false;
    });

    var loopCB = function () {
        if (doSend) {
            if (lastVal == null) {
                lastVal = Math.random();
            }

            var jitter = (Math.random() - 0.5) / 10;
            lastVal = lastVal + jitter;
            lastVal = Math.max(0, Math.min(1.0, lastVal));
            var val1 = lastVal * 100;
            var val2 = lastVal * 1023;

            for (var id in monitoredDevices) {
                socket.emit('device_data', {DataPoint: {streamId: id + "/DIO/1", data: val1}});
                socket.emit('device_data', {DataPoint: {streamId: id + "/DIO/3", data: val2}});
                socket.emit('device_data', {DataPoint: {streamId: id + "/DIO/4", data: val2}});
            }
        }
        else {
            // Do nothing
        }
    }
    var interval = setInterval(loopCB, 1000);
});
