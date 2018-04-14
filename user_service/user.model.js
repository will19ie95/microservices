var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt-nodejs");
var SALT_FACTOR = 10;
var crypto = require("crypto");
var shortId = require("shortid")
var jwt = require('jsonwebtoken');
const secret = require("./secret");

function isEmail(email) {
  // regex check for email
  return (
    email.length &&
    /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
      email
    )
  );
}

const userSchema = new Schema({
  email: {
    type: String,
    validate: [isEmail, "Invalid Email Address"],
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  vToken: {
    type: String,
  },
  followers: [{ type: String }],
  following: [{ type: String }]
});


// hash password before saving
userSchema.pre("save", function (done) {
  const noop = function () { };
  const user = this;
  if (!user.isModified("password")) {
    return done();
  }
  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) {
      return done(err);
    }
    bcrypt.hash(user.password, salt, noop, function (err, hashedPassword) {
      if (err) {
        return done(err);
      }
      user.password = hashedPassword;
      done();
    });
  });
});

userSchema.methods.checkPassword = function (guess, done) {
  bcrypt.compare(guess, this.password, function (err, isMatch) {
    done(err, isMatch);
  });
};

userSchema.methods.verify = function (token) {
  if (this.vToken === token) {
    this.isVerified = true;
  }
  return this.isVerified;
};

userSchema.methods.generateJwt = function () {
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  return jwt.sign({
    _id: this._id,
    email: this.email,
    username: this.username,
    exp: parseInt(expiry.getTime() / 1000),
  }, secret.mySecret);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
