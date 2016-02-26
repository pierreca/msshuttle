'use strict'

var DocDBClient = require('documentdb').DocumentClient;
var EventHubClient = require('azure-event-hubs').Client;
var debug = require('debug')('locationMonitor');

var eHubsConnStr = "[Iot Hub Connection String]";
var docDBKey = "[DocDB Key]";
var docDBEndpoint = "https://msshuttleposition.documents.azure.com:443/";
var dbDefinition = {
    id: "shuttlepoints"
};

var dbClient = new DocDBClient(docDBEndpoint, {"masterKey" : docDBKey });
var ehClient = EventHubClient.fromConnectionString(eHubsConnStr);

//-122.127864, 47.640790 OK
// 47.640790, -122.127864 NOT OK
var verifyInFence = function (lat, lng, callback) {
    var querySpec = {
       query: 'SELECT f.id, ST_WITHIN ({\'type\': \'Point\', \'coordinates\':[@lng, @lat]}, f.fence) FROM geofences f' ,
       parameters: [{
           name: '@lat',
           value: lat
       },{
           name: '@lng',
           value: lng
       }]
    };

    var collectionUri = "dbs/" + dbDefinition.id + "/colls/geofences";

    dbClient.queryDocuments(collectionUri, querySpec).toArray(function(err, result){
       if(err) {
           callback(err);
       } else {
           callback(null, result);
       }
    });
};

var printError = function (err) {
  console.error(err.message);
};

var processEvent = function (ehEvent) {
  debug('Event Received: ' + JSON.stringify(ehEvent.body));
  verifyInFence(ehEvent.body.lat, ehEvent.body.lng, function(err, result) {
      var negation = result['$1'] ? '' : 'not ';
      console.log(ehEvent.systemProperties['iothub-connection-device-id'] + ' is ' + negation + 'on the Microsoft Campus');
  })
};


var client = EventHubClient.fromConnectionString(eHubsConnStr);
var receiveAfterTime = Date.now() - 5000;

client.open()
      .then(client.getPartitionIds.bind(client))
      .then(function (partitionIds) {
        return partitionIds.map(function (partitionId) {
          return client.createReceiver('$Default', partitionId, { 'startAfterTime' : receiveAfterTime}).then(function(receiver) {
            receiver.on('errorReceived', printError);
            receiver.on('message', processEvent);
          });
        });
      })
      .then(client.createSender.bind(client))
      .catch(printError);
