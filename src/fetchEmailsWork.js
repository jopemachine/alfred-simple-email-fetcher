const {simpleParser} = require('mailparser');
// const alfy = require('alfy');
const Imap = require('imap');

require('./init');

const config = {
	"autoMarkSeen": true,
		"providerPrefix": false,
		"subtitle": "default",
		"sorting": "provider-timeDesc",
		"usingHtmlCache": true,
		"maxEmailsCount": 50,
		"accounts": {
			"naver": {
				"url": "https://mail.naver.com/",
				"link": "https://mail.naver.com/",
				"enabled": true,
				"icon": "naver.png",
				"imap": {
					"user": "jopemachine@naver.com",
					"password": "!jpM2s261V0",
					"host": "imap.naver.com",
					"port": 993,
					"tls": true,
					"authTimeout": 3000
				}
			},
			"naver2": {
				"url": "https://mail.naver.com/",
				"enabled": true,
				"icon": "naver.png",
				"imap": {
					"user": "jopemachine@naver.com",
					"password": "!jpM2s261V0",
					"host": "imap.naver.com",
					"port": 993,
					"tls": true,
					"authTimeout": 3000
				}
			},
			"naver3": {
				"url": "https://mail.naver.com/",
				"enabled": true,
				"icon": "naver.png",
				"imap": {
					"user": "jopemachine@naver.com",
					"password": "!jpM2s261V0",
					"host": "imap.naver.com",
					"port": 993,
					"tls": true,
					"authTimeout": 3000
				}
			}
		}
};

function openInbox(imap, callback) {
	imap.openBox('INBOX', true, callback);
}

const fetchEmailsWork = async ({account, searchCriteria}) => {
	return new Promise((resolve, reject) => {
		try {
			const mails = [];
			const imapConfig = config.accounts[account].imap;
			imapConfig.keepalive = false;
			const imapConnection = new Imap(imapConfig);

			const clearConnection = () => {
				imapConnection.destroy();
			};

			imapConnection.once('ready', () => {
				openInbox(imapConnection, (error, box) => {
					if (error) {
						throw error;
					}

					imapConnection.search(searchCriteria, (error, uids) => {
						if (error) {
							throw error;
						}

						try {
							const fetcher = imapConnection.fetch(uids, {
								bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
								markSeen: config.autoMarkSeen
							});

							fetcher.on('message', (message, seqNumber) => {
								let concatedBuf;
								const seqNumberUidsMap = new Map();

								message.on('body', (readableStream, info) => {
									const buffers = [];

									readableStream.on('data', data => {
										buffers.push(data);
									});
									readableStream.on('end', () => {
										concatedBuf = Buffer.concat(buffers);
									});
								});
								message.once('attributes', attrs => {
									seqNumberUidsMap.set(seqNumber, attrs.uid);
								});
								message.once('end', () => {
									const uid = seqNumberUidsMap.get(seqNumber);

									simpleParser(concatedBuf).then(parsedResult => {
										mails.push({
											uid,
											provider: account,
											title: parsedResult.subject,
											from: parsedResult.from.text,
											date: parsedResult.date
										});

										if (uids.length <= mails.length) {
											imapConnection.emit('end');
										}
									});
								});
							});
							fetcher.once('error', error_ => {
								reject(error_);
							});
						} catch {
							// Nothing to fetch error
							clearConnection();
							resolve([]);
						}
					});
				});
			});

			imapConnection.once('error', error => {
				clearConnection();
				reject(error);
			});

			imapConnection.once('end', () => {
				clearConnection();
				resolve(mails);
			});

			imapConnection.connect();
		} catch {
			reject({
				errorMsg: {
					title: `Authentication failure in "${account}" account`,
					subtitle: `Check smtp/imap setting on ${account} email settings`
				}
			});
		}
	});
};

module.exports = fetchEmailsWork;
