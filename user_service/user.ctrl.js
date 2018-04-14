const User = require("./user.model");
const db = require("./db");
const shortId = require("shortid");
const moment = require("moment");
const nodemailer = require("./nodemailer");

// Connection to database done in user_service.js
// db.connect("mongodb://127.0.0.1:27017/twitter");

exports.login = function (req, res, next) {
  const username = req.body.username
  const password = req.body.password
  User.findOne({ username: username }, function (err, user) {
    if (err) { return next(err) }
    if (!user) {
      return next(new Error("User Not Found"))
    }
    if (!user.isVerified) {
      return next(new Error("User Not Verified"))
    }
    user.checkPassword(password, function (err, isMatch) {
      if (err) { return next(err) }
      if (isMatch) {
        // jwt auth token
        token = user.generateJwt();
        // block some private user data
        userData = {
          username: user.username,
          email: user.email
        }
        // set browser cookie
        res.cookie('twitter-jwt', token);
        return res.json({
          status: "OK",
          // message: "",
          user: userData,
          token: token
        });

      } else {
        return next(new Error("Invalid Password/Username"))
      }
    })
  })

}
exports.logout = function (req, res, next) {
  const jwt = res.cookie("twitter-jwt");
  if (jwt) {
    // delete cookie from browser
    res.clearCookie('twitter-jwt');
    return res.json({
      status: "OK",
      message: "Successfully Logged Out"
    });
  } else {
    // no cookie set.
    return next(new Error("No user logged in"))
  }
}
exports.addUser = function (req, res, next) {
  const email = req.body.email;
  User.findOne({ email: email }, function (err, user) {
    if (err) { return next(err) }
    if (user) {
      return next(new Error("Email already in use!"))
    } else {
      const newUser = new User();
      newUser.username = req.body.username;
      newUser.email = req.body.email;
      newUser.password = req.body.password;
      newUser.vToken = shortId.generate()
      newUser.save(function (err) {
        if (err) { return next(err) }
        // send vToken email verification
        nodemailer.sendMail(newUser.email, newUser.vToken);
        return res.json({
          status: "OK",
          message: "Successfully created user! Verification Key Sent to " + newUser.email,
          vToken: newUser.vToken,
          // user: newUser,
        })
      })
    }
  });
}
exports.verify = function (req, res, next) {
  // check for get  query too.
  const email = req.body.email || req.query.email;
  const key = req.body.key || req.query.key;

  User.findOne({ email: email }, function (err, user) {
    if (err) { return next(err) }
    if (!user) {
      return next(new Error("Email not found"))
    }
    // check user is not alredy verified 
    if (user.isVerified) {
      return next(new Error("User is already verified"))
    }
    if (key === "abracadabra" || key === user.vToken) {
      user.isVerified = true;
      user.save(function (err, updatedUser) {
        if (err) { return next(err) }
        return res.json({
          status: "OK",
          message: "Successfully Verified"
        })
      })
    } else {
      return next(new Error("Key does not match"))
    }
  })
}
exports.getUser = function (req, res, next) {
  const username = req.query.username || req.params['username'];

  User.findOne({ username: username }, function (err, user) {
    if (err) { return next(err) }

    if (!user) {
      return next(new Error("User with username: <" + username + "> Not Found"))
    }

    // hide password and other info
    let user_data = {
      email: user.email,
      followers: user.followers.length,
      following: user.following.length,
    };

    return res.json({
      status: "OK",
      message: "Found User",
      user: user_data
    })

  })


}
exports.getFollowers = function (req, res, next) {
  const username = req.params['username'];
  const limit = req.body['limit'] || 50;

  User.findOne({ username: username }, function (err, user) {
    if (err) { return next(err) }

    if (!user) {
      return next(new Error("User with username: <" + username + "> Not Found"))
    }

    return res.json({
      status: "OK",
      message: "Found list of followers for:" + username,
      users: user.followers
    })
  })
}
exports.getFollowing = function (req, res, next) {
  const username = req.params['username'];
  const limit = req.body['limit'] || 50;

  User.findOne({ username: username }, function (err, user) {
    if (err) { return next(err) }

    if (!user) {
      return next(new Error("User with username: <" + username + "> Not Found"))
    }

    return res.json({
      status: "OK",
      message: "Found list of followings for:" + username,
      users: user.following
    })
  })
}
exports.follow = function (req, res, next) {

  const username_to_follow = req.body.username;
  const follow = req.body.follow; // If false then unfollow
  if (follow === null) {
    follow = true;
  }

  // const username = req.payload.username; 
  // const _id = req.payload._id; //get _id from jwt
  const username = req.user.username;
  const _id = req.user._id;

  if (username_to_follow === username && follow) {
    return next(new Error("you cant follow yourself. loser. LOL. JK."));
  }

  if (!_id) {
    return next(new Error("UnauthorizedError: Bad JWT Token"));
  } else {
    const query = { _id: _id };
    const update = follow ? { $addToSet: { following: username_to_follow } } : { $pull: { following: username_to_follow } };
    const options = { new: true }
    // update current user
    User.findOneAndUpdate(query, update, options, function (err, user) {
      if (err) {
        return next(new Error("Failed to followed/unfollowed user: " + username_to_follow))
      }
      if (!user) {
        return next(new Error("User with username: <" + username + "> Not Found"));
      }

      // update the other user
      const query_2 = { username: username_to_follow };
      const update_2 = follow ? { $addToSet: { followers: username } } : { $pull: { followers: username } };
      const options = { new: true }

      User.findOneAndUpdate(query_2, update_2, options, function (err, user) {

        if (err) { return next(err) }

        if (!user) {
          return next(new Error("User with username: <" + username_to_follow + "> Not Found"))
        } else {
          return res.json({
            status: "OK",
            message: "Successfully followed/unfollowed " + username_to_follow
          })
        }
      })
    })

  }

}