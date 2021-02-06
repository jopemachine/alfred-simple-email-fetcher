/* eslint-disable node/no-path-concat */
const alfy = require('alfy')
const process = require('process')
const _ = require('lodash')
const fs = require('fs')
const fsPromises = fs.promises

const config = require('../config.json')
const usageCache = require('../cache.json')
const { getTimeStamp, getParentAbsolutePath } = require('./utils')
const { Worker } = require('worker_threads')

// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.removeAllListeners('warning')

const searchCriteria = [process.argv[2]]
const accountsArg = process.argv[3]

let unreadMails = []
const targetAccounts = accountsArg
  ? accountsArg.includes(',')
    ? accountsArg.split(',')
    : [accountsArg]
  : _.filter(
    Object.keys(config.accounts),
    (account) => config.accounts[account].enabled
  );

(async function () {
  if (
    config.cacheDuration !== false &&
    new Date().getTime() - usageCache.date < config.cacheDuration
  ) {
    unreadMails = usageCache.cache
  } else {
    const workers = new Set()
    for (const account of targetAccounts) {
      const worker = new Worker(`${__dirname}/fetchEmailsWork.js`)
      workers.add(worker)
      worker.postMessage({
        account,
        searchCriteria
      })
      worker.on('message', async ({ mails, errorMsg }) => {
        if (mails) {
          unreadMails = [...unreadMails, ...mails]
        } else if (errorMsg) {
          alfy.output(errorMsg)
          process.exit(1)
        }
        workers.delete(worker)
        if (workers.size === 0) {
          await mainThreadCallback()
        }
      })
    }
  }
}())

async function mainThreadCallback () {
  let result

  if (unreadMails.length === 0) {
    result = [
      {
        title: `No ${searchCriteria[0].toLowerCase()} emails`,
        subtitle: `Searched through ${targetAccounts.length} providers`,
        text: {
          copy: `No ${searchCriteria[0].toLowerCase()} emails`,
          largetype: `No ${searchCriteria[0].toLowerCase()} emails`
        },
        icon: {
          path: alfy.icon.info
        }
      }
    ]
  } else {
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

    const mailCounter = {
      title: `${unreadMails.length} emails were found.`,
      subtitle: `Searched through ${targetAccounts.length} providers`,
      autocomplete: `${unreadMails.length}`,
      arg: '',
      quicklookurl: '',
      text: {
        copy: `${unreadMails.length} emails were found.`,
        largetype: `${unreadMails.length} emails were found.`
      }
    }

    result = [
      mailCounter,
      ..._.map(unreadMails, (mail) => {
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
          quicklookurl: `${getParentAbsolutePath()}/htmlCache/${
            mail.provider
          }/${mail.uid}.html`,
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
    ]
  }

  accountsArg &&
    result.splice(0, 0, {
      title: 'Back',
      subtitle: 'Back to selector',
      autocomplete: 'Back',
      arg: 'back',
      icon: {
        path: './icons/back-button.png'
      }
    })

  alfy.output(result)

  // * Force the connection to shut down.
  // * May have a memory leak because connection close is not called explicitly.

  process.exit(1)
}
