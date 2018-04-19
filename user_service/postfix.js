var email = require("emailjs");

exports.postfixSend = function (emailInfo, callback) {

  var server = email.server.connect({
    user: "no.reply.twitterClone",
    password: "will19ie95",
    host: "smtp.gmail.com",
    ssl: false
  });

  server.send({
    text: emailInfo.text,
    from: emailInfo.from,
    to: emailInfo.to,
    subject: emailInfo.subject
  }, function (err, message) {
    callback(err);
  });

}