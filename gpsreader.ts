var nmea = require('nmea');
var serial = require('serialport');
var debug = require('debug')('msshuttle:obd');

class GpsPosition {
    latitude: number;
    longitude: number;
    altitude: number; 
}

class GpsReader {
    started: boolean;
    status: GpsPosition;
    serialPort: any;
    
    public constructor(comPort:string) {
        this.serialPort = new serial.SerialPort(comPort, { 
            baudrate: 9600, 
            parser: serial.parsers.readline('\r\n')
        });
        
        this.started = false;
        this.status = new GpsPosition();
    }
    
    public start() : void {
        if (!this.started) {
            this.started = true;
            this.serialPort.on('data', function (line) {
                try {
                    var parsedData = nmea.parse(line);
                    debug('Parsed: ' + JSON.stringify(parsedData));
                    if (parsedData.hasOwnProperty('lat')) {
                        this.status.latitude = parsedData.lat;
                        this.status.longitude = parsedData.lon;
                        this.status.altitude = parsedData.alt;
                    }
                } catch (err) {
                    debug('Could not parse: ' + line)
                }
            });
        }
    }
}

var gpsReader = new GpsReader('COM7');
gpsReader.start();

