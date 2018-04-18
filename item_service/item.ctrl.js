const Item = require("./item.model");
const User = require("./user.model");
// const db = require("../db");
const moment = require("moment");

exports.addItem = function (req, res, next) {
  const username = req.user.username;
  const content = req.body.content;
  const parent  = req.body.parent;
  const childType = req.body.childType || null;

  const newItem = new Item({
    username: username,
    content: content,
    timestamp: moment().unix(),
    parent: parent,
    childType: childType
  })
  newItem.save(err => {
    if (err) { return next(err) }
    return res.json({
      status: "OK",
      message: "Successfully created Item",
      id: newItem.id,
      item: newItem
    })
  });
}
exports.getItem = function (req, res, next) {
  const id = req.query.id || req.params['id'];

  Item.findOne({ id: id }, function (err, item) {
    if (err) { return next(err) }
    if (!item) { return next(new Error("Item Not Found")) }
    return res.json({
      status: "OK",
      message: "Item Found",
      item: item
    })
  })
}
exports.deleteItem = function (req, res, next) {
  const id = req.query.id || req.params['id'];
  // delete associated media files...first or later
  // FIX ME

  // delete item
  Item.deleteOne({ id: id }, function(err) {
    // NEEDS STATUS NOT 2XX
    if (err) { 
      return res.status(500).json({
        status: "error",
        error: err.message
      })
    }
    return res.status(200).json({
      status: "200 OK",
      message: "Successfully DELETED Item with id: " + id
    })
  })

}
exports.likeItem = function (req, res ,next) {
  const username = req.user.username;
  const user_id = req.user._id;
  const item_id = req.params['id'];
  const like = (req.body.like !== false) ? true : false;
  
  const query = { id: item_id, "property.likes": { $gte: 0 } };
  // FIX ME. need to increment likes. or remove from db.
  const update = like ? { $addToSet: { liked_by: username }, $inc: { "property.likes": 1 } } : { $pull: { liked_by: username }, $inc: { "property.likes": -1 } };
  Item.findOneAndUpdate(query, update, (err, updated_item) => {
    if (err) { return next(err) }
    if (!updated_item) { return next(new Error("Failed to like item with query: ", query)) }
    return res.json({
      status: "OK",
      message: "Successfully updated like for item: " + item_id
    })
  })
}
// FIX ME
// Sepearate Search Into Micro Service Elastic Search
exports.search = function (req, res, next) {
  // req.user populated by jwt cookie
  const username = req.user.username // curr user
  const timestamp = moment().unix(req.body.timestamp) || moment().unix(); //default time is NOW if none provided
  const query_string = req.body.q;
  const username_filter = req.body.username;
  const rank = req.body.rank === "time" ? "time" : "interest"; // order return item by "time" or "interest", default "interest".
  const parent = req.body.parent || ""; // default none
  const hasMedia = (req.body.hasMedia !== false) ? true : false;; //default true
  const only_following = (req.body.following !== false) ? true : false; // default true 

  var limit = req.body.limit || 25;       // default 25 if none provided
  limit = (limit > 100) ? 100 : limit;      // limit to 100

  // content: /query_string/i,
  var query = {
    timestamp: { $lte: timestamp }
  }

  // append query regex for content if exist
  if (query_string) {
    query["content"] = {
      "$regex": query_string,
      "$options": "i" // ignore cases
    }
  }

  // if true, return post by jwt user following
  if (only_following) {
    // find following for jwt user
    User.findOne({ username: req.user.username }, function (err, user) {
      // list of following, only return if match any of these
      var following = user.following;

      // append username constraint if exist
      if (username_filter) {
        // possible duplication, fix me
        following.push(username_filter)
      }

      var following_filter = { $in: following }

      query["username"] = following_filter

      Item.find(query, function (err, items) {
        if (err) { return next(err) }
        if (!items) { return next(new Error("No Items found")) }
        return res.json({
          status: "OK",
          message: "Found Items",
          items: items.slice(0, limit)
        })
      })
    })
  } else {
    // append username constraint if exist
    if (username_filter) {
      // Create username key in query object
      query["username"] = {
        // append username_filter to search for it
        $in: [
          username_filter
        ]
      }
    }

    // only following is false, return all
    Item.find(query, function (err, items) {
      if (err) { return next(err) }
      if (!items) { return next(new Error("No Items found")) }
      return res.json({
        status: "OK",
        message: "Found Items",
        items: items.slice(0, limit)
      })
    })
  }
}
