const alfy = require("alfy");
const process = require("process");
const imaps = require("imap-simple");
const config = require("./config.json");
const _ = require("lodash");

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.removeAllListeners('warning');

let unreadMails = [];

(async function () {
  await Promise.all(
    _.map(Object.keys(config.accounts), async account => {
      const imapConn = await imaps.connect(config.accounts[account]);
      await imapConn.openBox("INBOX");
  
      const searchCriteria = ["UNSEEN"];
  
      const fetchOptions = {
        // bodies: ["HEADER", "TEXT"],
        bodies: ["HEADER"],
        markSeen: false,
      };
  
      const results = await imapConn.search(searchCriteria, fetchOptions);
  
      const subjects = results.map(function (res) {
        return res.parts.filter(function (part) {
          return part.which === "HEADER";
        })[0].body.subject[0];
      });
  
      unreadMails = [...unreadMails, ...subjects];
    })
  );
  
  const result = _.map(unreadMails, (mail) => {
    return {
      title: mail,
      subtitle: "",
      autocomplete: "",
      text: {
        copy: "",
        largetype: "",
      },
      arg: ``,
      quicklookurl: ``,
    };
  });

  alfy.output(result);

  // await connection.imap.closeBox(true);
  // await connection.end();

  // * Force the connection to shut down.
  // * May have a memory leak because connection close is not called explicitly.

  process.exit(1);

}) ();
