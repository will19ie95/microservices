var express = require('express');
var morgan = require('morgan');
var http = require('http');
var mongo = require('mongoose');
var winston = require('winston');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
const ItemCtrl = require("./item.ctrl")
const errorHandlers = require("./errorHandlers");
const secret = require("./secret");
const amqp = require("./item.amqp");
const jwt = require('express-jwt');
const auth = jwt({
  secret: secret.mySecret,
  getToken: function (req) { return req.cookies['twitter-jwt']; }
});

// Logging
winston.emitErrs = true;
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
});

logger.stream = {
  write: function (message, encoding) {
    logger.debug(message.replace(/\n$/, ''));
  }
};

// Express and middlewares
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())
app.use(
  //Log requests
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: logger.stream
  })
);

var db;
// if (process.env.MONGO_URL) {
  // mongo.connect(process.env.MONGO_URL, null, function (err, db_) {
var url = url || "mongodb://127.0.0.1:27017/twitter"
// const url = "mongodb://130.245.168.230:27017/twitter"
  mongo.connect(url, null, function (err, db_) {
    if (err) {
      logger.error(err);
    } else {
      db = db_;
      console.log("Connected to Mongo...")
    }
  });
// }

app.use(function (req, res, next) {
  if (!db) {
    //Database not connected
    // mongo.connect(process.env.MONGO_URL, null, function (err, db_) {
    mongo.connect(url, null, function (err, db_) {
      if (err) {
        logger.error(err);
        res.sendStatus(500);
      } else {
        db = db_;
        next();
      }
    });
  } else {
    next();
  }
});

// require("./amqp_servers/amqp.additem.server");
// require("./amqp_servers/amqp.likeitem.server");

// Actual query, REST
app.get("/", (req, res, next) => { res.send("Hello from item microservice") })
// app.post("/item/:id/like", auth, ItemCtrl.likeItem) // /item/:id
// app.post("/search", auth, ItemCtrl.search)
// app.post("/additem", auth, ItemCtrl.addItem)
// app.delete("/item/:id", auth, ItemCtrl.deleteItem);
app.get("/item/:id", ItemCtrl.getItem) // /item/:id
app.get("/item", ItemCtrl.getItem) // /item?id=    Support or nah?

// AMQP Client Request.
app.post("/item/:id/like", auth, amqp.likeItem) // /item/:id
app.post("/search", auth, amqp.search)
app.post("/additem", auth, amqp.addItem)
// app.delete("/item/:id", auth, amqp.deleteItem);


// Error Handling
app.use(errorHandlers.logErrors)
app.use(errorHandlers.errorHandler)

// Standalone server setup
var port = process.env.PORT || 3000;
http.createServer(app).listen(port, function (err) {
  if (err) {
    logger.error(err);
  } else {
    logger.info('Item MicroService Listening on http://localhost:' + port);
  }
});