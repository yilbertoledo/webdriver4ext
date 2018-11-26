var nodemailer = require("nodemailer");
const config = require("./config.js");

var transporter = nodemailer.createTransport({
  service: config.mailService,
  auth: {
    user: config.mailAuthUser,
    pass: config.mailAuthPass
  }
});

const sendMail = async (subject, body) => {
  let mailOptions = {
    from: config.mailAuthUser,
    to: config.mailRecipient,
    subject: subject,
    text: body
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = {
  sendMail
};
