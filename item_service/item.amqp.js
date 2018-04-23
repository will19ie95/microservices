var amqp = require('amqplib/callback_api');
const uuidv4 = require('uuid/v4');
var shortId = require("shortid");
const moment = require("moment");

exports.addItem = function(req, res, next) {
  // send AMQP 
  const username = req.user.username;
  const content = req.body.content;
  const parent = req.body.parent;
  const childType = req.body.childType || null;
  const id = shortId.generate();

  amqp.connect('amqp://yong:yong@130.245.168.55', function (err, conn) {
    if (err) { next(new Error("Failed to connected Rabbitmq")) }
    console.log(" [x] Connected to rabbitmq...")
    conn.createChannel(function (err, ch) {
      ch.assertQueue('', { exclusive: true }, function (err, q) {
        if (err) { next(new Error("Failed to assert queue")) }
        // genereate ID for this task
        var corr = uuidv4();
        var item = {
          username: username,
          content: content,
          parent: parent,
          childType: childType,
          id: id
        };
        ch.prefetch(1);
        ch.consume(q.queue, function (item) {
          // check the id for this msg.
          if (item.properties.correlationId == corr) {
            // callback to let us know we got it.
            const reply = JSON.parse(item.content)
            console.log(' [.] Added Item:  %s', reply.item._id);
            ch.ack(item);
            ch.close();
            // setTimeout(function () { conn.close() }, 500);
            return res.json(reply)
          }
        }, { noAck: false });

        // Send a request to queue to be fufilled
        ch.sendToQueue('additem_rpc_queue',
        // ch.sendToQueue('additem_rpc_queue_test',
          new Buffer(JSON.stringify(item)),
          { correlationId: corr, replyTo: q.queue });
      });
    });
  });

}


exports.likeItem = function (req, res, next) {
  // send AMQP 
  const username = req.user.username;
  const user_id = req.user._id;
  const item_id = req.params['id'];
  const like = (req.body.like !== false) ? true : false;

  amqp.connect('amqp://yong:yong@130.245.168.55', function (err, conn) {
    if (err) { next(new Error("Failed to connected Rabbitmq")) }
    // console.log(" [x] Connected to rabbitmq...")
    conn.createChannel(function (err, ch) {
      ch.assertQueue('', { exclusive: true }, function (err, q) {
        if (err) { next(new Error("Failed to assert queue")) }
        // genereate ID for this task
        var corr = uuidv4();
        var item = {
          username: username,
          user_id: user_id,
          item_id: item_id,
          like: like
        };
        ch.prefetch(1);
        ch.consume(q.queue, function (item) {
          // check the id for this msg.
          if (item.properties.correlationId == corr) {
            // callback to let us know we got it.
            const reply = JSON.parse(item.content)
            // send back ack.
            ch.ack(item);
            ch.close();
            // setTimeout(function () { conn.close() }, 500);
            return res.json(reply)
          }
        }, { noAck: false });

        // Send a request to queue to be fufilled
        ch.sendToQueue('likeitem_rpc_queue',
        // ch.sendToQueue('likeitem_rpc_queue_test',
          new Buffer(JSON.stringify(item)),
          { correlationId: corr, replyTo: q.queue });
      });
    });
  });
}


// SEARCH AMQP Client
exports.search = function (req, res, next) {

  var limit = req.body.limit || 25;       // default 25 if none provided
  limit = (limit > 100) ? 100 : limit;      // limit to 100

  // req.user populated by jwt cookie
  const search = {
    options: {
      username: req.user.username, // curr user
      timestamp: moment().unix(req.body.timestamp) || moment().unix(), //default time is NOW if none provided
      query_string: req.body.q || "",
      username_filter: req.body.username,
      rank: req.body.rank === "time" ? "time" : "interest", // order return item by "time" or "interest", default "interest".
      parent: req.body.parent || "", // default none
      hasMedia: (req.body.hasMedia === true) ? true : false, //default false
      only_following: (req.body.following !== false) ? true : false // default true 
    },
  }

  var limit = req.body.limit || 25;       // default 25 if none provided
  search.options.limit = (limit > 100) ? 100 : limit;    

  // content: /query_string/i,
  search.query = {
    timestamp: { $lte: search.options.timestamp }
  }

  // append query regex for content if exist
  if (search.options.query_string) {
    search.query["content"] = {
      "$regex": search.options.query_string,
      "$options": "i" // ignore cases
    }
  }

  amqp.connect('amqp://yong:yong@130.245.168.55', function (err, conn) {
    if (err) { next(new Error("Failed to connected Rabbitmq")) }
    // console.log(" [x] Connected to rabbitmq...")
    conn.createChannel(function (err, ch) {
      ch.assertQueue('', { exclusive: true }, function (err, q) {
        if (err) { next(new Error("Failed to assert queue")) }
        // genereate ID for this task
        var corr = uuidv4();

        ch.prefetch(1);
        ch.consume(q.queue, function (search) {
          // check the id for this msg.
          if (search.properties.correlationId == corr) {
            // callback to let us know we got it.
            var reply = JSON.parse(search.content)

            console.log(' [.] Searched Item:  ', reply);
            // send back ack.
            ch.ack(search);
            ch.close();
            // setTimeout(function () { conn.close() }, 500);
            return res.json(reply)
            // return res.json({
            //   status: "OK",
            //   message: "Found Items",
            //   items: search_results.items.slice(0, limit)
            // })
          }
        }, { noAck: false });

        // Send a request to queue to be fufilled
        ch.sendToQueue('searchitem_rpc_queue',
        // ch.sendToQueue('searchitem_rpc_queue_test',
          new Buffer(JSON.stringify(search)),
          { correlationId: corr, replyTo: q.queue });
      });
    });
  });


}