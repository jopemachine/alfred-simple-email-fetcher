# ✉️ alfred-simple-email-fetcher

<img src="https://img.shields.io/badge/Alfred-4-blueviolet"> <img src="https://img.shields.io/github/license/jopemachine/alfred-simple-email-fetcher.svg" alt="License"> <img src="https://img.shields.io/npm/dt/alfred-simple-email-fetcher" alt="NPM Release">

Fetch new emails in Alfred

<img src="./demo.gif">

## 📌 Prerequisite

* Node JS higher than `11.7.0`

* [Alfred powerpack](https://www.alfredapp.com/powerpack/)

##  🔨 How to install

1. Install package through npm

```
$ npm install --global alfred-simple-email-fetcher
```

2. Run `em > config` and setup account settings

3. Set the imap settings for the account you added.
May you can refer to the [documents](https://github.com/jopemachine/alfred-simple-email-fetcher/tree/master/documents)

## 📍 Configuration

You can configure detailed settings by editing your `config.json`.

Example:

```json
{
    "autoMarkSeen": false,
    "providerPrefix": true,
    "subtitle": "date-from",
    "maxEmailsCount": 50,
    "sorting": "provider-timedesc",
    "accounts": {
        "google": {
            "enabled": true,
            "icon": "google.png",
						"link": "https://mail.google.com/mail/",
            "imap": {
                "user": "user@gmail.com",
                "password": "account_password",
                "host": "imap.gmail.com",
                "port": 993,
                "tls": true,
                "authTimeout": 3000
            }
        },
        "naver": {
            "enabled": true,
            "icon": "naver.png",
						"link": "https://mail.naver.com/",
            "imap": {
                "user": "user@naver.com",
                "password": "account_password",
                "host": "imap.naver.com",
                "port": 993,
                "tls": true,
                "authTimeout": 3000
            }
        }
    }
}
```
### autoMarkSeen

Type: `Boolean`

Mark seen when fetch emails

### providerPrefix

Type: `Boolean`

Append email provider name to email record.

### subtitle

Type: `String (enum)`

`date` or `from` or `date-from` or `from-date` or `account` or `default`

default value shows account, date, from.

### maxEmailsCount

Type: `Number`

Set the maximum number of emails to display.

### sorting

Type: `String (enum)`

Sorts and returns search results.

* `subject` (mail title)
* `provider-subject` (sort provider first and subject)
* `timeDesc` (recent email first)
* `timeAsec` (old email first)
* `provider-timeAsec`
* `provider-timeDesc`

### accounts

Type: `Array of object`

You can register multiple email accounts.

this workflow use `worker_thread` at each imap connection.

#### enabled

Type: `Boolean`

If this value is false, this account is ignored.

#### icon

Type: `String`

Show this icon on this account's emails.

icon files should be placed within `icons` folder.

#### imap

Type: `Object`

imap configuration object used by [node-imap](https://github.com/mscdex/node-imap#connection-instance-methods).

imap's default port value is `993`.

you could find out `host` value in your account's imap setting page.

`keepalive` option will be set false in script, you can set other options in config file.

## 📗 How to use

### emu

Fetch and show emails on `UNSEEN` state from registered accounts.

### emau

Select one provider and fetch only the account's `UNSEEN` emails.

You can fetch emails which account's `enabled` is false by this method.

Open the `config.json` file through your editor.
