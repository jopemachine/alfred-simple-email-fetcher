const _ = require('lodash')
const alfy = require('alfy')
require('./init')
const config = alfy.config.get('setting')

const showAllAccounts = {
  title: 'Fetch from all accounts',
  autocomplete: 'Including disabled account',
  arg: Object.keys(config.accounts).join(','),
  icon: {
    path: alfy.icon.info
  }
}

alfy.output([
  showAllAccounts,
  ...(_.map(Object.keys(config.accounts), (account) => {
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
  }).reverse())
])
