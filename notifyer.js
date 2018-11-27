const notifier = require("node-notifier");

const sendMessage = async (title, message) => {
  notifier.notify(
    {
      title: title,
      message: message
    },
    (err, response) => {
      console.log("Error trying to send native notification: " + err);
    }
  );
};

module.exports = {
  sendMessage
};
