const alfy = require('alfy');

if (!alfy.config.has('setting')) {
	const defaultConfig = {
		autoMarkSeen: true,
		providerPrefix: false,
		subtitle: 'default',
		sorting: 'provider-timeDesc',
		maxEmailsCount: 50,
		accounts: {
			google: {
				enabled: false,
				icon: 'google.png',
				link: 'https://mail.google.com/mail/',
				imap: {
					user: '',
					password: '',
					host: 'imap.gmail.com',
					port: 993,
					tls: true,
					authTimeout: 3000
				}
			},
			naver: {
				enabled: false,
				icon: 'naver.png',
				link: 'https://mail.naver.com/',
				imap: {
					user: '',
					password: '',
					host: 'imap.naver.com',
					port: 993,
					tls: true,
					authTimeout: 3000
				}
			},
			daum: {
				enabled: false,
				icon: 'daum.png',
				link: 'https://mail.daum.net/',
				imap: {
					user: '',
					password: '',
					host: 'imap.daum.net',
					port: 993,
					tls: true,
					authTimeout: 3000
				}
			}
		}
	};

	alfy.config.set('setting', defaultConfig);
}
