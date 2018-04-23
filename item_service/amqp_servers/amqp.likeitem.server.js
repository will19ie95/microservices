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
    var q = 'likeitem_rpc_queue';

    console.log(' [x] Awaiting RPC requests');
    ch.assertQueue(q, { durable: true });
    ch.prefetch(1);
    ch.consume(q, function reply(msg) {
      var item = JSON.parse(msg.content)

      // consume the message DO THE WORK.
      // 
      console.log(" [.] liked_item(%s)");
      // console.log(item)

      const query = { id: item.item_id };
      // FIX ME. need to increment likes. or remove from db.
      const update = item.like ? { $addToSet: { liked_by: item.username } } : { $pull: { liked_by: item.username } };
      Item.findOneAndUpdate(query, update, (err, updated_item) => {
        var reply;

        if (err) { 
          console.log(err.stack)
          reply = {
            status: "error",
            message: "Error: " + err.stack
          }
        }
        if (!updated_item) { 
          reply = {
            status: "error",
            message: "Item Not Found"
          }
        } else {
          reply = {
            status: "OK",
            message: "Successfully updated like " + updated_item.id,
            item: updated_item
          }
        }
        
        ch.sendToQueue(msg.properties.replyTo,
          // returning the new updated item
          new Buffer(JSON.stringify(reply)),
          { correlationId: msg.properties.correlationId },
          { persistent: true });
        ch.ack(msg);
      })
    });
  });
});