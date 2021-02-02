const alfy = require('alfy')
const process = require('process')
const imaps = require('imap-simple')
const _ = require('lodash')
const config = require('../config.json')
const usageCache = require('../cache.json')
const fs = require('fs')
const fsPromises = fs.promises

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
          bodies: config.usingHtmlCache ? ['HEADER', 'TEXT', ''] : ['HEADER'],
          markSeen: config.autoMarkSeen
        }

        const messages = await imapConn.search(searchCriteria, fetchOptions)

        const mails = await Promise.all(
          _.map(messages, async function (item) {
            const header = _.find(item.parts, { which: 'HEADER' })

            if (config.usingHtmlCache) {
              const all = _.find(item.parts, { which: '' })
              const id = item.attributes.uid
              const idHeader = 'Imap-Id: ' + id + '\r\n'
              const parsedResult = await simpleParser(idHeader + all.body)

              await fsPromises.writeFile(
                `htmlCache/${account}/${id}.html`,
                parsedResult.html,
                { encoding: 'utf-8' },
                () => {}
              )
            }

            return {
              uid: item.attributes.uid,
              provider: account,
              title: header.body.subject[0],
              from: header.body.from[0],
              date: Number(new Date(header.body.date[0]).getTime())
            }
          })
        )

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
        unreadMails = _.sortBy(unreadMails, ['title']).reverse()
        break
      case 'providerAndSubject':
        unreadMails = _.sortBy(unreadMails, ['provider', 'title']).reverse()
        break
      case 'timeDesc':
        unreadMails = _.sortBy(unreadMails, ['date']).reverse()
        break
      case 'providerAndTimeDesc':
        unreadMails = _.sortBy(unreadMails, ['provider', 'date']).reverse()
        break
      case 'timeAsec':
        unreadMails = _.sortBy(unreadMails, ['date'])
        break
      case 'providerAndTimeAsec':
        unreadMails = _.sortBy(unreadMails, ['provider', 'date'])
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
        autocomplete: mail.title,
        arg: config.accounts[mail.provider].url,
        quicklookurl: `${getParentAbsolutePath()}/htmlCache/${mail.provider}/${
          mail.uid
        }.html`,
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
      subtitle: `Searched through ${
        _.filter(config.accounts, (item) => item.enabled).length
      } providers`,
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