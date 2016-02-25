var nmea = require('nmea');
var fs = require('fs');
var serial = require('serialport');
var debug = require('debug')('msshuttle:obd');

export module GpsReader {
    export class GpsPosition {
        latitude: number;
        longitude: number;
        altitude: number; 
    }

    export class GpsReader {
        realData: boolean;
        started: boolean;
        status: GpsPosition;
        serialPort: any;
        
        public constructor(realData: boolean, comPort:string) {
            this.realData = realData;
            if(this.realData) {
                this.serialPort = new serial.SerialPort(comPort, { 
                    baudrate: 9600, 
                    parser: serial.parsers.readline('\r\n')
                });
            } 
            this.started = false;
            this.status = new GpsPosition();
        }
        
        public start() : void {
            if (!this.started) {
                this.started = true;
                var self = this;
                if(this.realData) {
                    this.serialPort.on('data', function (line) {
                        try {
                            var parsedData = nmea.parse(line);
                            debug('Parsed: ' + JSON.stringify(parsedData));
                            if (parsedData.hasOwnProperty('lat')) {
                                self.status.latitude = parsedData.lat / 100;
                                self.status.longitude = parsedData.lon / 100;
                                self.status.altitude = parsedData.alt;
                            }
                        } catch (err) {
                            debug('Could not parse: ' + line)
                        }
                    });
                } else {
                    var fakeData = [];
                    var lineReader = require('readline').createInterface({
                        input: require('fs').createReadStream('fakegps.txt')
                    });

                    lineReader.on('line', function (line) {
                        fakeData.push(line);
                        console.log(line);
                    });
                    
                    var i = 0;
                    setInterval(function() {
                        var parsedData = nmea.parse(fakeData[i]);
                        debug('Parsed: ' + JSON.stringify(parsedData));
                        if (parsedData.hasOwnProperty('lat')) {
                            self.status.latitude = parsedData.lat / 100;
                            self.status.longitude = parsedData.lon / 100;
                            self.status.altitude = parsedData.alt;
                        }
                        i++;
                    }, 1000);
                }
            }
        }
    }
    
    // var gpsReader = new GpsReader(true, 'COM7');
    // gpsReader.start();
    
    // setInterval(function() {
    //     console.log('Lat: ' + gpsReader.status.latitude + ' - Lng: ' + gpsReader.status.longitude + ' - Alt: ' + gpsReader.status.altitude);
    // }, 1000);
}