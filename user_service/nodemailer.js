const nodemailer = require("nodemailer");
const moment = require("moment")
const postfix = require("./postfix") 

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "twitterclonezzz",
    pass: "will19ie95"
  }
});

const sendMail = function(email, vToken) {
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: 'Twitter Clone👻 <no.reply.twitterClone@gmail.com>', // sender address
    to: email, // email of client
    subject: 'Hello From Twitter Clone 👻', // Subject line
    text: "validation key: <" + vToken + ">", // plaintext body
  };

  // send mail with postfix
  // postfix.postfixSend(mailOptions, function (error, info) {
  //   if (error) {
  //     return console.log(error);
  //   }
  //   console.log('Message sent: ' + info.response);
  // })

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
  });
}

module.exports = {
  sendMail: sendMail
}