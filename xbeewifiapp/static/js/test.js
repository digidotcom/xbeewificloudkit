/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

// socket.io specific code
var socket = io.connect("/device", {'transports': ['xhr-polling']});

socket.on('connect', function () {
	$('#panel').removeClass('panel-success panel-danger panel-info');
    $('#panel').addClass('panel-success');
});

socket.on('device_data', function(data){
	$('#panel').removeClass('panel-success panel-danger panel-info');
    $('#panel').addClass('panel-success');
	message(JSON.stringify(data));
});

socket.on('device_status', function(data){
	$('#panel').removeClass('panel-success panel-danger panel-info');
    $('#panel').addClass('panel-success');
	message(JSON.stringify(data));
});

socket.on('reconnecting', function () {
	$('#panel').removeClass('panel-success panel-danger panel-info');
	$('#panel').addClass('panel-info');
    message('Attempting to re-connect to the server...');
});

socket.on('error', function (e) {
	$('#panel').removeClass('panel-success panel-danger panel-info');
	$('#panel').addClass('panel-danger');
    message(e);
});

socket.on('started_monitoring', function(device_id){
	$('#panel').removeClass('panel-success panel-danger panel-info');
    $('#panel').addClass('panel-success');
	message('Successfully registered for device data from ' + device_id);
});

socket.on('stopped_monitoring', function(device_id){
	message('Unregistered from data for ' + device_id);
});

function message (msg) {
    $('#messagelog').append($('<pre><p>').append(msg));
    $("#messagelog").animate({ scrollTop: $("#messagelog").prop("scrollHeight") }, 500);
}

function startMonitoringDevice(deviceid){
	socket.emit('startmonitoringdevice', deviceid);
}

function stopMonitoringDevice(deviceid){
	socket.emit('stopmonitoringdevice', deviceid);
}
