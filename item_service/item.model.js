var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var moment = require("moment");
var shortId = require("shortid");

const itemSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  property: {
    likes: {
      type: Number,
      default: 0
    }
  },
  retweeted: {
    type: Number,
    default: 0
  },
  content: {
    type: String
  },
  timestamp: {
    type: Date,
    // set at creation
    required: true
  },
  id: {
    type: String,
    unique: true,
    default: shortId.generate
  },
  parent: {
    type: String,
  },
  media: {
    type: [String]
  },
  childType: {
    type: String,
    // null if not a child item, set otherwise.
    default: null
  },
  liked_by: {
    type: [String]
  }
});

itemSchema.post("update", function(item) {
  item.property.likes = item.liked_by.length()
  console.log("Item " + item.id + " updated.")
})

const Item = mongoose.model("Item", itemSchema);
module.exports = Item;
