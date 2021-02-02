const alfy = require('alfy')
const process = require('process')
const imaps = require('imap-simple')
const _ = require('lodash')
const config = require('../config.json')
const usageCache = require('../cache.json')
const fs = require('fs')

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.removeAllListeners('warning');

(async function () {
  let unreadMails = []
  let totalRecordCnts = 0

  if (new Date().getTime() - usageCache.date < config.cacheDuration) {
    unreadMails = usageCache.cache
    totalRecordCnts = usageCache.cache.length
  } else {
    await Promise.all(
      _.map(Object.keys(config.accounts), async (account) => {
        if (!config.accounts[account].enabled) return

        const imapConn = await imaps.connect(config.accounts[account])
        await imapConn.openBox('INBOX')

        const searchCriteria = ['UNSEEN']
        const fetchOptions = {
          // bodies: ["HEADER", "TEXT"],
          bodies: ['HEADER'],
          markSeen: config.autoMarkSeen
        }

        const results = await imapConn.search(searchCriteria, fetchOptions)
        const mails = results.map(function (res) {
          return {
            title: res.parts[0].body.subject[0],
            date: res.parts[0].body.date[0],
            from: res.parts[0].body.from[0],
            provider: account
          }
        })

        totalRecordCnts += mails.length
        unreadMails = [...unreadMails, ...mails]

        fs.writeFileSync(
          'cache.json',
          '\ufeff' +
            JSON.stringify(
              {
                date: new Date().getTime(),
                cache: unreadMails
              },
              null,
              2
            ),
          { encoding: 'utf8' }
        )
        // await imapConn.imap.closeBox(true);
        // await imapConn.end();
      })
    )
  }

  let result = []
  if (totalRecordCnts === 0) {
    result.push({
      title: 'No unread emails',
      subtitle: '',
      autocomplete: '',
      arg: '',
      quicklookurl: '',
      text: {
        copy: '',
        largetype: ''
      }
    })
  } else {
    result = _.map(unreadMails, (mail) => {
      return {
        title: config.servicePrefix
          ? `[${mail.provider}] ` + mail.title
          : mail.title,
        subtitle: `${mail[config.subtitle]}`,
        autocomplete: '',
        arg: '',
        quicklookurl: '',
        icon: {
          path: config.accounts[mail.provider].icon
            ? config.accounts[mail.provider].icon
            : './icons/default.png'
        },
        text: {
          copy: mail.title,
          largetype: mail.title
        }
      }
    })

    result.reverse()
    result.splice(0, 0, {
      title: `${unreadMails.length} emails were found.`,
      subtitle: 'Press Enter on this item to mark all the below emails',
      autocomplete: '',
      arg: '',
      quicklookurl: '',
      text: {
        copy: '',
        largetype: ''
      }
    })
  }

  alfy.output(result)

  // * Force the connection to shut down.
  // * May have a memory leak because connection close is not called explicitly.

  process.exit(1)
})()
