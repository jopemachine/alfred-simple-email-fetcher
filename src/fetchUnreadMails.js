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
          await fsPromises.mkdir(`htmlCache/${account}`, { recursive: true })
        } else {
          await fsPromises.rmdir(`htmlCache/${account}`, { recursive: true })
          await fsPromises.mkdir(`htmlCache/${account}`, { recursive: true })
        }

        try {
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
                { encoding: 'utf-8' }
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

          await fsPromises.writeFile(
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
            { encoding: 'utf-8' }
          )
        } catch (err) {
          alfy.output([
            {
              title: `Authentication failure in "${account}" account`,
              subtitle: `Check smtp/imap setting on ${account} email settings`,
              icon: {
                path: alfy.icon.error
              }
            }
          ])
          process.exit(1)
        }

        // * Not works
        // await imapConn.imap.closeBox(true);
        // await imapConn.end();
      })
    )
  }

  let result = []
  if (unreadMails.length === 0) {
    result.push({
      title: 'No unseen emails',
      text: {
        copy: 'No unseen emails',
        largetype: 'No unseen emails'
      },
      icon: {
        path: alfy.icon.info
      }
    })
  } else {
    switch (config.sorting) {
      case 'subject':
        unreadMails = _.sortBy(unreadMails, ['title']).reverse()
        break
      case 'provider-subject':
        unreadMails = _.sortBy(unreadMails, ['provider', 'title']).reverse()
        break
      case 'timeDesc':
        unreadMails = _.sortBy(unreadMails, ['date']).reverse()
        break
      case 'provider-timeDesc':
        unreadMails = _.sortBy(unreadMails, ['provider', 'date']).reverse()
        break
      case 'timeAsec':
        unreadMails = _.sortBy(unreadMails, ['date'])
        break
      case 'provider-timeAsec':
        unreadMails = _.sortBy(unreadMails, ['provider', 'date'])
        break
      default:
        break
    }

    result = _.map(unreadMails, (mail) => {
      let subtitle = ''
      if (config.subtitle === 'date') {
        subtitle = getTimeStamp(new Date(mail.date))
      } else if (config.subtitle === 'date-from') {
        subtitle = `${getTimeStamp(new Date(mail.date))}, from ${mail.from}`
      } else if (config.subtitle === 'from-date') {
        subtitle = `${mail.from}, in ${getTimeStamp(new Date(mail.date))}`
      } else {
        subtitle = `${mail.from}`
      }

      return {
        title: config.providerPrefix
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
            ? `./icons/${config.accounts[mail.provider].icon}`
            : './icon.png'
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
      autocomplete: `${unreadMails.length}`,
      arg: '',
      quicklookurl: '',
      text: {
        copy: `${unreadMails.length} emails were found.`,
        largetype: `${unreadMails.length} emails were found.`
      }
    })
  }

  alfy.output(result)

  // * Force the connection to shut down.
  // * May have a memory leak because connection close is not called explicitly.

  process.exit(1)
})()
