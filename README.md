# alfred-multiple-emails

<img src="https://img.shields.io/github/license/jopemachine/alfred-multiple-emails.svg" alt="License">

Simple workflow that retrieves unread mails from multiple accounts using imap for Alfred 4

* 

<p align="center">
<img src="./demo.png">
</p>

## 📌 Prerequisite

* Node JS

* [Alfred powerpack](https://www.alfredapp.com/powerpack/)

* Chrome 87.0.4280.88

##  🔨 How to install

1. Install package by npm

```
$ npm install --global alfred-multiple-emails
```

2. Run `em > config` and setup account settings

3. Set the imap settings for the account you added.
You can refer to the [documents](https://github.com/jopemachine/alfred-multiple-emails/tree/master/documents)


## 📗 Configuration

You can configure detailed settings by editing your `config.json`.

```json
{
    "autoMarkSeen": false,
    "servicePrefix": true,
    "subtitle": "date",
    "cacheDuration": false,
    "sorting": "providerAndTime",
    "usingHtmlCache": true,
    "accounts": {
        "google": {
            "url": "https://mail.google.com/mail/",
            "enabled": true,
            "icon": "./icons/google.png",
            "imap": {
                "user": "user@gmail.com",
                "password": "some_password",
                "host": "imap.gmail.com",
                "port": 993,
                "tls": true,
                "authTimeout": 3000
            }
        },
        "naver": {
            "url": "https://mail.naver.com/",
            "enabled": true,
            "icon": "./icons/naver.png",
            "imap": {
                "user": "user@naver.com",
                "password": "some_password",
                "host": "imap.naver.com",
                "port": 993,
                "tls": true,
                "authTimeout": 3000
            }
        }
    }
}
```


## 📗 How to use

### emu { Argument }

Fetch and show emails on `UNSEEN` state from registered accounts.

### em > config

Open the `config.json` file through your editor.

