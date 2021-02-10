# ✉️ alfred-simple-email-fetcher

<img src="https://img.shields.io/badge/Alfred-4-blueviolet"> <img src="https://img.shields.io/github/license/jopemachine/alfred-simple-email-fetcher.svg" alt="License">

Fetch and show emails through imap

<img src="./demo.gif">

## 📌 Prerequisite

* Node JS

* [Alfred powerpack](https://www.alfredapp.com/powerpack/)

##  🔨 How to install

1. Install package by npm

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
    "cacheDuration": false,
    "sorting": "provider-timedesc",
    "accounts": {
        "google": {
            "enabled": true,
            "icon": "google.png",
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

### cacheDuration

Type: `Number | Boolean`

set cache period (ms)

To not use caching, set this value to `false`

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

imap configuration object used by [imap-simple](https://github.com/mscdex/node-imap#connection-instance-methods).

imap's default port value is `993`.

you could find out `host` value in your account's imap setting page.

`keepalive` option will be set false in script, you can set other options in config file.


## 📗 How to use

### emu

Fetch and show emails on `UNSEEN` state from registered accounts.

### emau

Select one provider and fetch only the account's `UNSEEN` emails.

You can fetch emails which account's `enabled` is false by this method.

### emd

Fetch and show emails on `DRAFT` state from registered accounts.

### emad

Select one provider and fetch only the account's `DRAFT` emails.

### emf

Fetch and show emails on `FLAGGED` state from registered accounts.

### emaf

Select one provider and fetch only the account's `FLAGGED` emails.

### emans

Fetch and show emails on `ANSWERED` state from registered accounts.

### emaans

Select one provider and fetch only the account's `ANSWERED` emails.

### em > config

Open the `config.json` file through your editor.

### em > clearcache

Clean all saved html cache.
