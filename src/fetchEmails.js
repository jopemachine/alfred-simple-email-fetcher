const alfy = require('alfy')
const process = require('process')
const path = require('path')
const _ = require('lodash')
const fs = require('fs')
const fsPromises = fs.promises

require('./init')
const config = alfy.config.get('setting')
const usageCache = require('../cache.json')
const { getTimeStamp, getParentAbsolutePath } = require('./utils')
const { Worker } = require('worker_threads')

let searchCriteria = [process.argv[2]]
const accountsArg = process.argv[3]

let unreadMails = []
let checkFlag = false

if (process.argv[2] === 'UNSEEN-NOCACHE') {
  checkFlag = true
  searchCriteria = ['UNSEEN']
}

const targetAccounts = accountsArg
  ? accountsArg.includes(',')
    ? accountsArg.split(',')
    : [accountsArg]
  : _.filter(
    Object.keys(config.accounts),
    (account) => config.accounts[account].enabled
  )

if (targetAccounts.length === 0) {
  alfy.output([
    {
      title: 'First, setup your config.json file',
      subtitle: 'you can use \'em > config\'',
      icon: {
        path: alfy.icon.info
      }
    }
  ])
  process.exit(1)
}

(async function () {
  if (
    config.cacheDuration !== false &&
    new Date().getTime() - usageCache.date < config.cacheDuration
  ) {
    unreadMails = usageCache.cache
  } else {
    const workers = new Set()
    for (const account of targetAccounts) {
      const worker = new Worker(path.join(`${__dirname}`, 'fetchEmailsWork.js'))
      workers.add(worker)
      worker.postMessage({
        account,
        checkFlag,
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
        subtitle: `From ${targetAccounts.length} accounts`,
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
    !checkFlag &&
      (await fsPromises.writeFile(
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
      ))

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

    let hasCutted = false
    const fetchedEmailsCount = unreadMails.length
    if (fetchedEmailsCount > config.maxEmailsCount) {
      unreadMails = unreadMails.slice(0, config.maxEmailsCount)
      hasCutted = true
    }

    const mailCounter = {
      title: `${fetchedEmailsCount} emails were found.`,
      subtitle: `From ${targetAccounts.length} accounts ${
        hasCutted
          ? '(' + (fetchedEmailsCount - unreadMails.length) + ' not shows)'
          : ''
      }`
    }

    result = [
      mailCounter,
      ..._.map(unreadMails, (mail) => {
        let subtitle = ''
        const date = getTimeStamp(new Date(mail.date))
        const from = mail.from
        const account = config.accounts[mail.provider].imap.user

        if (config.subtitle === 'date') {
          subtitle = date
        } else if (config.subtitle === 'date-from') {
          subtitle = `${date}, from ${from}`
        } else if (config.subtitle === 'from-date') {
          subtitle = `${from}, in ${date}`
        } else if (config.subtitle === 'account') {
          subtitle = account
        } else if (config.subtitle === 'from') {
          subtitle = from
        } else {
          subtitle = `${account}, in ${date}, from ${from}`
        }

        return {
          title: config.providerPrefix
            ? `[${mail.provider}] ` + mail.title
            : mail.title,
          subtitle,
          arg: `${getParentAbsolutePath()}/htmlCache/${mail.provider}/${
            mail.uid
          }.html`,
          quicklookurl: `${getParentAbsolutePath()}/htmlCache/${
            mail.provider
          }/${mail.uid}.html`,
          icon: {
            path: config.accounts[mail.provider].icon
              ? `./icons/${config.accounts[mail.provider].icon}`
              : './icon.png'
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
  process.exit(1)
}
