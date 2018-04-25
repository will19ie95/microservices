const nodemailer = require("nodemailer");
const moment = require("moment")

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  tls: {
    rejectUnauthorized: false
  }
});

const sendMail = function (email, vToken) {
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: 'Twitter Clone👻 <no.reply.twitterClone@gmail.com>', // sender address
    to: email, // email of client
    subject: 'Hello From Twitter Clone 👻', // Subject line
    text: "validation key: <" + vToken + ">", // plaintext body
  };

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