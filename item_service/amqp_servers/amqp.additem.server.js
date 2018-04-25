#!/usr/bin/env node
const Item = require("../item.model");
const User = require("../user.model");
const moment = require("moment");
const db = require("../mongodb")
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  // host: '192.168.1.44:9200',
  host: '130.245.168.171:9200',
  // log: 'trace'
});

var amqp = require('amqplib/callback_api');
amqp.connect('amqp://yong:yong@130.245.168.55', function (err, conn) {
  if (err) { console.log(err.stack) }
  console.log(" [x] Item Server Connected to rabbitmq...")
  // Add Item 
  conn.createChannel(function (err, ch) {
    var q = 'additem_rpc_queue';
    // var q = 'additem_rpc_queue_test';

    console.log(' [x] Awaiting RPC requests');
    ch.assertQueue(q, { durable: true });
    ch.prefetch(1);
    ch.consume(q, function reply(additem) {
      // console.log("Adding item: ", JSON.parse(additem.content))
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
          const id_string = JSON.parse(JSON.stringify(newItem._id))
        
        client.index({
          index: "twitter",
          type: "items",
          id: id_string,
          body: {
            "username": newItem.username,
            "liked_by": newItem.liked_by,
            "media": newItem.media,
            "childType": newItem.childType,
            "retweeted": newItem.retweeted,
            "content": newItem.content,
            "__v": newItem._v,
            "timestamp": newItem.timestamp,
            "property": newItem.property,
            "id": newItem.id,
          }
        }, function (err, resp, status) {
          // console.log("Added " + newItem._id + " to ElasticSearch")
          // return res.json({
          //   status: "OK",
          //   message: "Successfully created Item",
          //   id: newItem.id,
          //   item: newItem
          // })
        });

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
            id: newitem._id,
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