#!/usr/bin/env node
var amqp = require('amqplib/callback_api');
const uuidv4 = require('uuid/v4');

amqp.connect('amqp://yong:yong@192.168.1.14', function (err, conn) {
  if (err) { console.log(err.stack) }
  console.log(" [x] Connected to rabbitmq...")
  conn.createChannel(function (err, ch) {
    ch.assertQueue('', { exclusive: true }, function (err, q) {
      // genereate ID for this task
      var corr = uuidv4();


      var item = JSON.parse(item);


      ch.consume(q.queue, function (msg) {
        // check the id for this msg.
        if (msg.properties.correlationId == corr) {
          // callback to let us know we got it.
          console.log(' [.] added Item %s', msg.content.toString());
          // send back ack.
          ch.ack(msg);
        }
      }, { noAck: false });

      // Send a msg to queue to be fufilled
      ch.sendToQueue('item_rpc_queue',
        new Buffer(JSON.parse(item)),
        { correlationId: corr, replyTo: q.queue });
    });
  });
});
