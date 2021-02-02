const alfy = require('alfy')
const process = require('process')
const imaps = require('imap-simple')
const _ = require('lodash')
const config = require('../config.json')
const usageCache = require('../cache.json')
const fs = require('fs')
const simpleParser = require('mailparser').simpleParser
const { getTimeStamp, getParentAbsolutePath } = require('./utils')

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.removeAllListeners('warning');

(async function () {
  let unreadMails = []

  if (
    config.cacheDuration !== false &&
    new Date().getTime() - usageCache.date < config.cacheDuration
  ) {
    unreadMails = usageCache.cache
  } else {
    await Promise.all(
      _.map(Object.keys(config.accounts), async (account) => {
        if (!config.accounts[account].enabled) return
        if (!fs.existsSync(`htmlCache/${account}`)) {
          fs.mkdirSync(`htmlCache/${account}`, { recursive: true })
        }

        const imapConn = await imaps.connect(config.accounts[account])
        await imapConn.openBox('INBOX')

        const searchCriteria = ['UNSEEN']
        const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          // bodies: ['HEADER'],
          markSeen: config.autoMarkSeen
        }

        const messages = await imapConn.search(searchCriteria, fetchOptions)

        messages.forEach(function (item) {
          const all = _.find(item.parts, { which: '' })
          const id = item.attributes.uid
          const idHeader = 'Imap-Id: ' + id + '\r\n'
          // eslint-disable-next-line node/handle-callback-err
          simpleParser(idHeader + all.body, (err, mail) => {
            unreadMails.push({
              title: mail.subject,
              from: mail.from.text,
              provider: account,
              date: Number(new Date(mail.date).getTime()),
              uid: id
            })

            fs.writeFile(
              `htmlCache/${account}/${id}.html`,
              mail.html,
              { encoding: 'utf-8' },
              () => {}
            )
          })
        })

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
  if (unreadMails.length === 0) {
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
    switch (config.sorting) {
      case 'subject':
        _.sortBy(unreadMails, ['title'])
        break
      case 'providerAndSubject':
        _.sortBy(unreadMails, ['provider', 'subject'])
        break
      case 'time':
        _.sortBy(unreadMails, ['date'])
        break
      case 'providerAndTime':
        _.sortBy(unreadMails, ['provider', 'title'])
        break
      default:
        break
    }

    result = _.map(unreadMails, (mail) => {
      let subtitle = ''
      if (config.subtitle === 'date') {
        subtitle = getTimeStamp(new Date(mail.date))
      } else {
        subtitle = `${mail[config.subtitle]}`
      }

      return {
        title: config.servicePrefix
          ? `[${mail.provider}] ` + mail.title
          : mail.title,
        subtitle,
        autocomplete: '',
        arg: config.accounts[mail.provider].url,
        // eslint-disable-next-line node/no-path-concat
        quicklookurl: `${getParentAbsolutePath()}/htmlCache/${mail.provider}/${mail.uid}.html`,
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

    result.splice(0, 0, {
      title: `${unreadMails.length} emails were found.`,
      subtitle: '',
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
