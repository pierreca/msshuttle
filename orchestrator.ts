// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
/// <reference path="obd2reader.ts" />

'use strict';

var Http = require('azure-iot-device-http').Http;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var Obd2Reader = require('./Obd2Reader').Obd2Reader;


class EngineRecord {
    at: string;
    rpm: number;
    speed: number;
    throttle: number;
    engineLoad: number;
    engineOilTemp: number;
    engine_light: boolean;
    lat: number;
    lng: number;
}

class GPSData {
    lat: number;
    lng: number;
}

class GpsObject {
    public getPosition() {
        var gpsData = new GPSData();
        gpsData.lat = 0.0;
        gpsData.lng = 0.0;
        return gpsData;
    }
}

class Orchestrator {
    public static main() : number {

        var orchestrator = new Orchestrator();
        var odb2 = new Obd2Reader.Obd2Reader(false, "COM3");
        var gps = new GpsObject();
        var IsOnline = require('is-online');
        var messages = [];

        // String containing Hostname, Device Id & Device Key in the following formats:
        //  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
        var connectionString = '[]';


        // fromConnectionString must specify a transport constructor, coming from any transport package.
        var client = Client.fromConnectionString(connectionString, Http);
        var connectCallback = function (err) {
            if (err) {
                console.log('Could not connect: ' + err.message);
            } else {
                console.log('Client connected');
                client.on('message', function (msg) {
                    console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
                    client.complete(msg, orchestrator.printResultFor('completed'));
                    // reject and abandon follow the same pattern.
                    // /!\ reject and abandon are not available with MQTT
                });

                var sendInterval = setInterval(function () {
                    
                    var vs = odb2.getStatus();
                    var enginerecord = new EngineRecord ();
                    enginerecord.at = vs.at;
                    enginerecord.engine_light = vs.engine_light;
                    enginerecord.rpm = vs.rpm;
                    enginerecord.throttle = vs.throttle;
                    var gpsData = gps.getPosition();
                    enginerecord.lat = gpsData.lat;
                    enginerecord.lng = gpsData.lng;
                    
                    var sendData = JSON.stringify(enginerecord);
                    var message = new Message(sendData);
                    messages.push(message);
                    IsOnline( function( err, online){
                        if (err) {
                            console.log("could not determine online status");
                        }
                        else {
                            if (online) {
                                console.log('Sending message: ' + message.getData());
                                client.sendEventBatch(messages, orchestrator.printResultFor('send'));
                                messages = [];                                                    
                            }
                            else {
                                console.log('storing message: ' + message.getData());
                            }
                        }
                    });
                // Read every 2 seconds
                }, 2000);

                client.on('error', function (err) {
                console.error(err.message);
                });

                client.on('disconnect', function () {
                clearInterval(sendInterval);
                client.removeAllListeners();
                client.connect(connectCallback);
                });
            }
        };
        
        client.open(connectCallback);
               
        return 0;
    }
    
    
    // Helper function to print results in the console
    public printResultFor(op) {
          return function printResult(err, res) {
            if (err) console.log(op + ' error: ' + err.toString());
            if (res) console.log(op + ' status: ' + res.constructor.name);
           };
    }
}

Orchestrator.main();