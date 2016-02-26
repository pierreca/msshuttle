var OBDReader = require('serial-obd');
var debug = require('debug')('msshuttle:obd');
var fs = require('fs');

export module Obd2Reader {
        
    export class VehicleStatus {
        at: string;
        rpm: number;
        speed: number;
        throttle: number;
        engineLoad: number;
        engineCoolantTemp: number;
        engine_light: boolean;
    }

    export class Obd2Reader {
        realData: boolean;
        status: VehicleStatus;
        serialOBDReader: any;
        constructor(realData: boolean, comPort: string) {
            this.status = new VehicleStatus();
            this.realData = realData;
            if (realData) {
                var self = this;
                this.serialOBDReader = new OBDReader('COM4', { baudrate: 115200 });
                this.serialOBDReader.on('dataReceived', function (data) {
                    debug(data);
                    self.status.at = new Date().toISOString();
                    if (data.name === 'vss') self.status.speed = data.value;
                    if (data.name === 'throttlepos') self.status.throttle = data.value;
                    if (data.name === 'rpm') self.status.rpm = data.value;
                    if (data.name === 'load_pct') self.status.engineLoad = data.value;
                    if (data.name === 'temp') self.status.engineCoolantTemp = data.value;
                    if(data.name === 'requestdtc') self.status.engine_light = !(data.value.errors[0].indexOf('undefined') > 0);
                });

                this.serialOBDReader.on('connected', function (data) {
                    this.addPoller("requestdtc");
                    this.addPoller("vss");
                    this.addPoller("rpm");
                    this.addPoller("temp");
                    this.addPoller("load_pct");
                    this.addPoller("map");
                    this.addPoller("throttlepos");

                    this.startPolling(2000); //Polls all added pollers each 2000 ms.
                });
            }
        }
        
        public start(): void {
            debug('OBD reader starting');
            var self = this;
            if (this.realData) {
                this.serialOBDReader.connect();
                setInterval(function(){
                    fs.appendFile('obd.txt', JSON.stringify(self.status) + '\r\n');
                }, 2000);
            } else {
                var fakeData = [];
                var lineReader = require('readline').createInterface({
                    input: require('fs').createReadStream('fakeobd.txt')
                });

                lineReader.on('line', function (line) {
                    fakeData.push(line);
                });
                
                var i = 0;
                var last = fakeData.length - 1;
                setInterval(function() {
                    if (i > last) i = 0;
                    self.status = JSON.parse(fakeData[i]);
                    i++;
                }, 2000);
            }
        }
        
        public getStatus() : VehicleStatus {
            return this.status;
        }
    }
    
    // var obdReader = new Obd2Reader(true, 'COM4');
    // obdReader.start();
    
    // setInterval(function() {
    //     console.log('RPM: ' + obdReader.status.rpm + ' - Throttle: ' + obdReader.status.throttle + ' - Load: ' + obdReader.status.speed);
    // }, 2000);
}
