#!/usr/bin/env node
const Item = require("../item.model");
const User = require("../user.model");
const moment = require("moment");
const db = require("../mongodb")
const elasticsearch = require("elasticsearch");
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
    var q = 'elastic_searchitem_rpc_queue';
    // var q = 'searchitem_rpc_queue_test';

    console.log(' [x] Awaiting RPC requests');
    ch.assertQueue(q, { durable: true });
    ch.prefetch(1);
    ch.consume(q, function reply(search) {
      var search_json = JSON.parse(search.content);

      // console.log("Searching with ")
      // console.log(search_json)


      var options = search_json.options;
      var query_string = options.query_string;
      var username_filter = options.username_filter;
      var username = options.username;
      var only_following = options.only_following;
      var limit = options.limit;
      var reply;

      // consume the message DO THE WORK.
      // console.log(" [.] searching(%s)", query_string);
      // console.log("limit: ", limit)

      var query = {
        "bool": {
          "must": []
        }
      };

      if (query_string) {
        // must match search string.
        query.bool.must.push({
          "match": {
            "content": query_string
          }
        })
      }

      if (username_filter) {
        // must match username string.
        query.bool.must.push({
          "match": {
            "username": username_filter
          }
        })
      }

      if (only_following) {
        // get followings

        User.findOne({ username: username }, function (err, user) {
          // if (err) { return next(err) }
          if (!user) {
            // return next(new Error("Username not Found"))
            reply = {
              status: "Error",
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
            // if (username_filter) {
            //   // possible duplication, fix me
            //   following.push(username_filter)
            // }

            // turn into query style { "username": }
            following_list = [];
            for (var i = 0; i < following.length; i++) {
              console.log("Following: ", following[i])
              following_list.push({
                "match": {
                  "username": following[i]
                }
              })
            }

            query.bool.should = following_list;

            var search_body = {
              from: 0,
              size: 200,
              sort: [
                { timestamp: { "order": "desc" } }
              ],
              query: query
            }

            client.search({
              index: 'twitter',
              type: 'items',
              body: search_body
            }).then(function (resp) {
              var hits = resp.hits.hits;
              // console.log("ElasticSearch Hit: ")
              // console.log(hits)

              // hits[x]._source
              function reduceItem(hit) {
                const item = hit._source;
                item._id = hit._id;
                return item;
              }

              // map reduce items from elastic hit result
              const items = hits.map(reduceItem)

              reply = {
                status: "OK",
                message: "Elastic Search Found Items",
                items: items.slice(0, limit),
                // hits: hits.slice(0, limit)
              }

              ch.sendToQueue(search.properties.replyTo,
                new Buffer(JSON.stringify(reply)),
                { correlationId: search.properties.correlationId },
                { persistent: true });
              ch.ack(search);

            }, function (err) {
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
            });

          }
          
        })
        
        


      } else {
        var search_body = {
          from: 0,
          size: 200,
          sort: [
            { timestamp: { "order": "desc" } }
          ],
          query: query
        }

        client.search({
          index: 'twitter',
          type: 'items',
          body: search_body
        }).then(function (resp) {
          var hits = resp.hits.hits;
          // console.log("ElasticSearch Hit: ")
          // console.log(hits)

          // hits[x]._source
          function reduceItem(hit) {
            const item = hit._source;
            item._id = hit._id;
            return item;
          }

          // map reduce items from elastic hit result
          const items = hits.map(reduceItem)

          reply = {
            status: "OK",
            message: "Elastic Search Found Items",
            items: items.slice(0, limit),
            // hits: hits.slice(0, limit)
          }

          ch.sendToQueue(search.properties.replyTo,
            new Buffer(JSON.stringify(reply)),
            { correlationId: search.properties.correlationId },
            { persistent: true });
          ch.ack(search);

        }, function (err) {
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
        });
      }
    });
  });
});