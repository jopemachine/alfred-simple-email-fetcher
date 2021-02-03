const _ = require('lodash')
const alfy = require('alfy')
const config = require('../config.json')

alfy.output(
  _.map(Object.keys(config.accounts), (account) => {
    return {
      title: account,
      subtitle: `${config.accounts[account].imap.user}`,
      autocomplete: account,
      arg: account,
      icon: {
        path: `icons/${config.accounts[account].icon}`
      },
      text: {
        copy: account,
        largetype: account
      }
    }
  })
)
