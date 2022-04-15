const alfy = require('alfy');
const process = require('process');
const _ = require('lodash');
const pMap = require('p-map');

require('./init');
const config = alfy.config.get('setting');
const {getTimeStamp} = require('./utils');
const fetchEmailsWork = require('./fetchEmailsWork');

const searchCriteria = [process.argv[2]];
const accountsArg = process.argv[3];

const targetAccounts = accountsArg ?
	(accountsArg.includes(',') ?
		accountsArg.split(',') :
		[accountsArg]) :
	_.filter(
		Object.keys(config.accounts),
		account => config.accounts[account].enabled
	);

if (targetAccounts.length === 0) {
	alfy.output([
		{
			title: 'First, setup your config.json file',
			subtitle: 'you can use \'em > config\'',
			icon: {
				path: alfy.icon.info
			}
		}
	]);
	process.exit(1);
}

(async function () {
	const works = targetAccounts.map(account => {
		return fetchEmailsWork({
			searchCriteria,
			account
		});
	});

	try {
		const unreadMails = _.flatten(await pMap(works, res => res));
		await handleUnreadEmails(unreadMails);
	} catch (error) {
		alfy.error(error);
	}
})();

async function handleUnreadEmails(unreadMails) {
	let result;
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
		];
	} else {
		switch (config.sorting) {
			case 'subject':
				unreadMails = _.sortBy(unreadMails, ['title']).reverse();
				break;
			case 'provider-subject':
				unreadMails = _.sortBy(unreadMails, ['provider', 'title']).reverse();
				break;
			case 'timeDesc':
				unreadMails = _.sortBy(unreadMails, ['date']).reverse();
				break;
			case 'provider-timeDesc':
				unreadMails = _.sortBy(unreadMails, ['provider', 'date']).reverse();
				break;
			case 'timeAsec':
				unreadMails = _.sortBy(unreadMails, ['date']);
				break;
			case 'provider-timeAsec':
				unreadMails = _.sortBy(unreadMails, ['provider', 'date']);
				break;
			default:
				break;
		}

		let hasCutted = false;
		const fetchedEmailsCount = unreadMails.length;
		if (fetchedEmailsCount > config.maxEmailsCount) {
			unreadMails = unreadMails.slice(0, config.maxEmailsCount);
			hasCutted = true;
		}

		const mailCounter = {
			title: `${fetchedEmailsCount} emails were found.`,
			subtitle: `From ${targetAccounts.length} accounts ${hasCutted ?
				'(' + (fetchedEmailsCount - unreadMails.length) + ' not shows)' :
				''
			}`
		};

		result = [
			mailCounter,
			..._.map(unreadMails, mail => {
				let subtitle = '';
				const date = getTimeStamp(new Date(mail.date));
				const {from} = mail;
				const account = config.accounts[mail.provider].imap.user;

				switch (config.subtitle) {
					case 'date': {
						subtitle = date;
						break;
					}

					case 'date-from': {
						subtitle = `${date}, from ${from}`;
						break;
					}

					case 'from-date': {
						subtitle = `${from}, in ${date}`;
						break;
					}

					case 'account': {
						subtitle = account;
						break;
					}

					case 'from': {
						subtitle = from;
						break;
					}

					default: {
						subtitle = `${account}, in ${date}, from ${from}`;
					}
				}

				const title = config.providerPrefix ? `[${mail.provider}] ` + mail.title : mail.title;
				const arg = config.accounts[mail.provider].link;
				const quicklookurl = config.accounts[mail.provider].link;

				return {
					title,
					subtitle,
					arg,
					quicklookurl,
					icon: {
						path: config.accounts[mail.provider].icon ?
							`./icons/${config.accounts[mail.provider].icon}` :
							'./icon.png'
					}
				};
			})
		];
	}

	if (accountsArg) {
		result.splice(0, 0, {
			title: 'Back',
			subtitle: 'Back to selector',
			autocomplete: 'Back',
			arg: 'back',
			icon: {
				path: './icons/back-button.png'
			}
		});
	}

	alfy.output(result);
}
