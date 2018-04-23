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
    var q = 'searchitem_rpc_queue';
    // var q = 'searchitem_rpc_queue_test';

    console.log(' [x] Awaiting RPC requests');
    ch.assertQueue(q, { durable: true });
    ch.prefetch(1);
    ch.consume(q, function reply(search) {
      var search_json = JSON.parse(search.content);
      var options = search_json.options;
      var limit = options.limit;
      var query = search_json.query;
      var reply;

      // consume the message DO THE WORK.
      // 
      console.log(" [.] searching(%s)", options.query_string);

      // if true, return post by jwt user following
      if (options.only_following) {
        // find following for jwt user
        User.findOne({ username: options.username }, function (err, user) {
          if (err) {
            reply = {
              status: "error",
              message: "Error: " + err.stack
            }
            ch.sendToQueue(search.properties.replyTo,
              new Buffer(JSON.stringify(reply)),
              { correlationId: search.properties.correlationId },
              { persistent: true });
            ch.ack(search);
          }
          if (!user) {
            reply = {
              status: "error",
              message: "User Not Found"
            }
            ch.sendToQueue(search.properties.replyTo,
              new Buffer(JSON.stringify(reply)),
              { correlationId: search.properties.correlationId },
              { persistent: true });
            ch.ack(search);
          } else {
            // list of following, only return if match any of these
            var following = user.following;

            // append username constraint if exist
            if (options.username_filter) {
              // possible duplication, fix me
              following.push(options.username_filter)
            }

            var following_filter = { $in: following }

            query["username"] = following_filter

            Item.find(query, function (err, items) {
              if (err) {
                reply = {
                  status: "error",
                  message: "Error: " + err.stack
                }
              }
              if (!items) {
                reply = {
                  status: "error",
                  message: "Item Not Found"
                }
              } else {
                reply = {
                  status: "OK",
                  message: "Found Items",
                  items: items.slice(0, limit)
                }
              }
              ch.sendToQueue(search.properties.replyTo,
                new Buffer(JSON.stringify(reply)),
                { correlationId: search.properties.correlationId },
                { persistent: true });
              ch.ack(search);
            })
          }
          
        })
      } else {
        // append username constraint if exist
        if (options.username_filter) {
          // Create username key in query object
          query["username"] = {
            // append username_filter to search for it
            $in: [
              options.username_filter
            ]
          }
        }
        // only following is false, return all
        Item.find(query, function (err, items) {
          if (err) { 
            reply = {
              status: "error",
              message: "Error: " + err.stack
            }
          }
          if (!items) { 
            reply = {
              status: "error",
              message: "Item Not Found"
            }
          } else {
            reply = {
              status: "OK",
              message: "Found Items",
              items: items.slice(0, limit)
            }
          }

          ch.sendToQueue(search.properties.replyTo,
            new Buffer(JSON.stringify(reply)),
            { correlationId: search.properties.correlationId },
            { persistent: true });
          ch.ack(search);
        })
      }

    });
  });
});