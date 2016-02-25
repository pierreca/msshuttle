var Obd2 = require('obd2');
var debug = require('debug')('msshuttle:obd');
var fs = require('fs');

module Obd2Reader {
        
    export class VehicleStatus {
        at: string;
        rpm: number;
        speed: number;
        throttle: number;
        engineLoad: number;
        engineOilTemp: number;
        engine_light: boolean;
    }

    export class Obd2Reader {
        realData: boolean;
        status: VehicleStatus;
        reader: any;
        constructor(realData: boolean, comPort: string) {
            this.status = new VehicleStatus();
            this.realData = realData;
            if (realData) {
                this.reader = new Obd2({
                    delay: 1000,
                    device: "elm327",
                    serial: "usb",
                    baud: 115200,
                    port: comPort
                });
                
                this.reader.on('dataParsed', function(data) {
                debug('data parsed: ' + data);
                });
                
                this.reader.on('dataReceived', function (data) {
                    debug('data received: ' + data);
                });
                
                // RPMs
                this.reader.readPID('0c', '01', function (data) {
                    debug('readPID: [PID = ' + data + '][MODE = ' + data + '][DATA = ' + data + ']');
                    this.status.rpm = parseInt(data.value); 
                });
                
                // Speed
                this.reader.readPID('0d', '01', function (data) {
                    debug('readPID: [PID = ' + data + '][MODE = ' + data + '][DATA = ' + data + ']');
                    this.status.speed = parseInt(data.value); 
                }); 
                
                // Throttle
                this.reader.readPID('5a', '01', function (data) {
                    debug('readPID: [PID = ' + data + '][MODE = ' + data + '][DATA = ' + data + ']');
                    this.status.throttle = parseInt(data.value); 
                });
                
                // Engine load
                this.reader.readPID('04', '01', function (data) {
                    debug('readPID: [PID = ' + data + '][MODE = ' + data + '][DATA = ' + data + ']');
                    this.status.engineLoad = parseInt(data.value); 
                });
                
                // Engine oil temp
                this.reader.readPID('5c', '01', function (data) {
                    debug('readPID: [PID = ' + data + '][MODE = ' + data + '][DATA = ' + data + ']');
                    this.status.engineOilTemp = parseInt(data.value); 
                });
            }
        }
        
        public start(): void {
            debug('OBD reader starting');
            if (this.realData) {
                this.reader.start(function () {
                    debug('OBD reader started.'); 
                });
            } else {
                var self = this;
                self.status.rpm = 600;
                
                setInterval(function () {
                    var rpmVariation = Math.floor((Math.random() - 0.5) * 1000);
                    var throttleVariation = Math.floor(Math.random() * 100);
                    
                    self.status.at = new Date().toISOString();
                    self.status.rpm += rpmVariation;
                    self.status.throttle = throttleVariation;
                    
                    if (self.status.rpm < 600) {
                        self.status.rpm = 600;
                        self.status.engine_light = true;
                    } else {
                        self.status.engine_light = false;
                    }
                    
                    if (self.status.rpm > 5000) {
                        self.status.rpm = 5000;
                        self.status.engine_light = true;
                    } else {
                        self.status.engine_light = false;
                    }
                    
                    if (self.status.throttle < 0) self.status.throttle = 0;
                    if (self.status.throttle > 100) self.status.throttle = 100;
                                    
                }, 1000);
            }
        }
        
        public getStatus() : VehicleStatus {
            return this.status;
        }
    }
}
