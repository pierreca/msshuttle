// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
/// <reference path="obd2reader.ts" />

'use strict';

var Http = require('azure-iot-device-http').Http;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var ConnectionString = require('azure-iot-common').ConnectionString;

var Obd2Reader = require('./Obd2Reader').Obd2Reader;
var GpsReader = require('./GpsReader').GpsReader;

var connectionString = process.argv[2];
var useRealData = true;
if (process.argv[3] === '-f' || process.argv[3] === '--fake')
{
    useRealData = false;
}

class EngineRecord {
    at: string;
    rpm: number;
    speed: number;
    throttle: number;
    engineLoad: number;
    engineCoolantTemp: number;
    engine_light: boolean;
    lat: number;
    lng: number;
}


class Orchestrator {
    public static main() : number {

        var orchestrator = new Orchestrator();
        var obd2 = new Obd2Reader.Obd2Reader(useRealData, "COM4");
        obd2.start();
        var gps = new GpsReader.GpsReader(useRealData, "COM7");
        gps.start();
        const isReachable = require('is-reachable');
        
        var messages = [];

        // String containing Hostname, Device Id & Device Key in the following formats:
        //  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
        var connectionDict = ConnectionString.parse(connectionString);
        var hostName = 'bing.com:80';
        // library wasn't finding hostname, using a fixed address.
        // var hostName = connectionDict.HostName;


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
                    
                    var vs = obd2.getStatus();
                    var enginerecord = new EngineRecord ();
                    enginerecord.at = vs.at;
                    enginerecord.engine_light = vs.engine_light;
                    enginerecord.rpm = Math.round(vs.rpm);
                    enginerecord.throttle = Math.round(vs.throttle);
                    var gpsData = gps.status;
                    enginerecord.lat = gpsData.latitude;
                    enginerecord.lng = -gpsData.longitude;
                    var nullOrUndefined= function(arg) {
                        return arg===null || arg === undefined;
                    }
                    if (!(nullOrUndefined(enginerecord.at) ||
                          nullOrUndefined(enginerecord.rpm) ||
                          nullOrUndefined(enginerecord.throttle) || 
                          nullOrUndefined(enginerecord.lat) ||
                          nullOrUndefined(enginerecord.lng) ||
                          nullOrUndefined(enginerecord.engine_light))) {
                            var sendData = JSON.stringify(enginerecord);
                            var message = new Message(sendData);
                            messages.push(message);
                            isReachable(hostName, function( err, reachable){
                                if (err) {
                                    console.log("could not determine online status");
                                }
                                else {
                                    if (reachable) {
                                        console.log('Sending message: ' + message.getData() + "count: " + messages.length.toString());
                                        client.sendEventBatch(messages, orchestrator.printResultFor('send'));
                                        messages = [];   
                                    }
                                    else {
                                        console.log('storing message: ' + message.getData());
                                    }
                                }
                            });                            
                        }
                                        
                    
                                // console.log('Sending message: ' + message.getData());
                                // client.sendEventBatch(messages, orchestrator.printResultFor('send'));
                                // messages = [];                                                    

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