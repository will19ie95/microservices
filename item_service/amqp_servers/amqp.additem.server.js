#!/usr/bin/env node
const Item = require("../item.model");
const User = require("../user.model");
const moment = require("moment");
const db = require("../mongodb")

var amqp = require('amqplib/callback_api');
amqp.connect('amqp://yong:yong@130.245.168.55', function (err, conn) {
  if (err) { console.log(err.stack) }
  console.log(" [x] Item Server Connected to rabbitmq...")
  // Add Item 
  conn.createChannel(function (err, ch) {
    var q = 'additem_rpc_queue';

    console.log(' [x] Awaiting RPC requests');
    ch.assertQueue(q, { durable: true });
    ch.prefetch(1);
    ch.consume(q, function reply(additem) {
      console.log("Adding item: ", JSON.parse(additem.content))
      var item = JSON.parse(additem.content)

      // consume the message DO THE WORK.
      console.log(" [.] add_item(%s)", item.id);

      const newItem = new Item({
        username: item.username,
        content: item.content,
        timestamp: moment().unix(),
        parent: item.parent,
        childType: item.childType,
        id: item.id
      })

      newItem.save((err, newitem) => {
        var reply;
        
        if (err) {
          console.log(err.stack)
          reply = {
            status: "error",
            message: "Error: " + err.stack
          }
        } else {
          reply = {
            status: "OK",
            message: "Successfully created Item",
            id: newitem.id,
            item: newitem
          }
        }

        ch.sendToQueue(additem.properties.replyTo,
          new Buffer(JSON.stringify(reply)),
          { correlationId: additem.properties.correlationId },
          { persistent: true });
        ch.ack(additem);
      });
    });
  });
});