var Obd2 = require('obd2');

class Obd2Reader {
    public static main(): number {
        console.log('OBD reader starting');
        var reader = new Obd2({
            delay: 1000,
            device: "elm327",
            serial: "usb",
            baud: 115200,
            port: "COM3"
        });
        
        reader.on('dataParsed', function(data) {
           console.log('data parsed!'); 
            console.log(data);
            console.log('--------------');
        });
        
        reader.on('dataReceived', function (data) {
            console.log('data received:');
            console.log(data);
            console.log('--------------');
        });
        
        
        reader.start(function () {
            console.log('started');
            reader.readPID('0c', '01', function (data) {
                console.log('readPID callback');
                console.log(data);
            });
        });
        
        return 0;
    }
}

Obd2Reader.main();