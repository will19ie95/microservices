// connection to Mongo Database
const mongoose = require("mongoose");
var state = {
  db: null
}

exports.connect = function (url, done) {
  if (state.db) return done()

  // DEFAULT mongo setting
  var url = url || "mongodb://192.168.1.9:27017/twitter";
  var done = done || function (err) {
    if (err) {
      console.log("Error connecting to mongo");
    } else {
      console.log("Connected to mongo");
    }
  }

  mongoose.connect(url, function (err, db) {
    if (err) return done(err)
    state.db = db
    done()
  })
}
// }() // immediately invoked function

exports.get = function () {
  return state.db
}

exports.close = function (done) {
  if (state.db) {
    state.db.close(function (err, result) {
      state.db = null
      state.mode = null
      done(err)
    })
  }
}