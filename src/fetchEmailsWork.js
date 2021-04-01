const { isMainThread, parentPort } = require('worker_threads')
const fs = require('fs')
const fsPromises = fs.promises
const simpleParser = require('mailparser').simpleParser
const alfy = require('alfy')
const Imap = require('imap')

require('./init')
const config = alfy.config.get('setting')

const process = require('process')
// Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.removeAllListeners('warning')

function openInbox (imap, cb) {
  imap.openBox('INBOX', false, cb)
}

// Execute this work on each account
if (!isMainThread) {
  parentPort.on('message', async ({ checkFlag, account, searchCriteria }) => {
    if (!checkFlag && !fs.existsSync(`htmlCache/${account}`)) {
      await fsPromises.mkdir(`htmlCache/${account}`, { recursive: true })
    }

    try {
      const mails = []
      const imapConfig = config.accounts[account].imap
      imapConfig.keepalive = false
      const imap = new Imap(imapConfig)

      imap.once('ready', function () {
        openInbox(imap, function (err, box) {
          if (err) throw err
          imap.search(searchCriteria, function (err, uids) {
            if (err) throw err
            try {
              const fetcher = imap.fetch(uids, {
                bodies: checkFlag ? 'HEADER' : '',
                markSeen: config.autoMarkSeen
              })

              fetcher.on('message', function (msg, seqno) {
                let concatedBuf
                const seqNumUidsMap = new Map()

                msg.on('body', function (rstream, info) {
                  const buffers = []

                  rstream.on('data', (data) => {
                    buffers.push(data)
                  })
                  rstream.on('end', () => {
                    concatedBuf = Buffer.concat(buffers)
                  })
                })
                msg.once('attributes', function (attrs) {
                  seqNumUidsMap.set(seqno, attrs.uid)
                })
                msg.once('end', function () {
                  const uid = seqNumUidsMap.get(seqno)

                  simpleParser(concatedBuf).then((parsedResult) => {
                    !checkFlag &&
                      fs.writeFileSync(
                        `htmlCache/${account}/${uid}.html`,
                        parsedResult.html
                      )

                    mails.push({
                      uid,
                      provider: account,
                      title: parsedResult.subject,
                      from: parsedResult.from.text,
                      date: parsedResult.date
                    })
                    if (uids.length <= mails.length) imap.emit('end')
                  })
                })
              })
              fetcher.once('error', function (err) {
                console.log('Fetch error: ' + err)
              })
            } catch (e) {
              // Nothing to fetch error
              parentPort.postMessage({ mails: [] })
              parentPort.close()
            }
          })
        })
      })

      imap.once('error', function (err) {
        console.log(err)
      })

      imap.once('end', function () {
        parentPort.postMessage({ mails })
        parentPort.close()
      })

      imap.connect()
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
