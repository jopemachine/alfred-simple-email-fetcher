const { isMainThread, parentPort } = require('worker_threads')
const fs = require('fs')
const fsPromises = fs.promises
const imaps = require('imap-simple')
const config = require('../config.json')
const simpleParser = require('mailparser').simpleParser
const alfy = require('alfy')
const _ = require('lodash')
const { checkFileExists } = require('./utils')
// const { unbracket, checkFileExists } = require('./utils')

const process = require('process')
// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.removeAllListeners('warning')

// Execute this work on each account
if (!isMainThread) {
  parentPort.on('message', async ({ account, searchCriteria }) => {
    try {
      const imapConn = await imaps.connect(config.accounts[account])
      await imapConn.openBox('INBOX')

      const fetchOptions = {
        bodies: config.usingHtmlCache ? ['HEADER', 'TEXT', ''] : ['HEADER'],
        markSeen: config.autoMarkSeen
      }

      const messages = await imapConn.search(searchCriteria, fetchOptions)

      if (!fs.existsSync(`htmlCache/${account}`)) {
        await fsPromises.mkdir(`htmlCache/${account}`, { recursive: true })
      }

      const mails = await Promise.all(
        _.map(messages, async function (item) {
          const header = _.find(item.parts, { which: 'HEADER' })
          // const mailId = unbracket(header.body['message-id'][0])

          if (config.usingHtmlCache) {
            const all = _.find(item.parts, { which: '' })
            const id = item.attributes.uid
            const idHeader = 'Imap-Id: ' + id + '\r\n'
            const parsedResult = await simpleParser(idHeader + all.body)
            const htmlCacheFileName = `htmlCache/${account}/${id}.html`

            if ((await checkFileExists(htmlCacheFileName)) === false) {
              await fsPromises.writeFile(
                htmlCacheFileName,
                parsedResult.html,
                { encoding: 'utf-8' }
              )
            }
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

      parentPort.postMessage({ mails })
      parentPort.close()
    } catch (err) {
      parentPort.postMessage({
        errorMsg: {
          title: `Authentication failure in "${account}" account`,
          subtitle: `Check smtp/imap setting on ${account} email settings`,
          icon: {
            path: alfy.icon.error
          }
        }
      })
      parentPort.close()
    }
  })
}
