var express = require('express');
var morgan = require('morgan');
var http = require('http');
var mongo = require('mongoose');
var winston = require('winston');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
const MediaCtrl = require("./media.ctrl")
const errorHandlers = require("./errorHandlers");
const multer = require('multer')
const upload = multer();

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

// Actual query
app.get("/", (req, res, next) => { res.send("Hello from media microservice") })
app.post("/addmedia", upload.single("contents"), MediaCtrl.addMedia);
app.get("/media/:fileId", MediaCtrl.getMedia)

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