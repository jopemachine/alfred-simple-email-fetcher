const process = require("process");

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const imaps = require("imap-simple");
const config = require("./config.json");

config.accounts.map(accountConfig => {
  imaps.connect(accountConfig).then(function (connection) {
    return connection.openBox("INBOX").then(function () {
      const searchCriteria = ["UNSEEN"];
  
      const fetchOptions = {
        bodies: ["HEADER", "TEXT"],
        markSeen: false,
      };
  
      return connection
        .search(searchCriteria, fetchOptions)
        .then(function (results) {
          const subjects = results.map(function (res) {
            return res.parts.filter(function (part) {
              return part.which === "HEADER";
            })[0].body.subject[0];
          });
  
          console.log(subjects);
        });
    });
  });
})
