
// First rule ID for session rules.
const RULE_OFFSET = 1000;

// Constant was introduced in Chrome 120, so add a fallback for older versions.
const MAX_RULE_COUNT = chrome.declarativeNetRequest.MAX_NUMBER_OF_SESSION_RULES ?? 1000;

// Next rule ID to insert
let ruleCounter = 0;

// Set with all hosts that have rules.
const modifiedHosts = new Set();

// Same but with a sorted list, to purge old hosts when we reach the limit.
const modifiedHostsList = [];

// All known resource types
const ALL_RESOURCE_TYPES = [
	'main_frame',
	'sub_frame',
	'stylesheet',
	'script',
	'image',
	'font',
	'object',
	'xmlhttprequest',
	'ping',
	'csp_report',
	'media',
	'websocket',
	'webtransport',
	'webbundle',
	'other',
];

// List of all client hint headers to remove.
const SEC_CH_HEADERS = [
	'Sec-CH-UA',
	'Sec-CH-UA-Arch',
	'Sec-CH-UA-Bitness',
	'Sec-CH-UA-Form-Factors',
	'Sec-CH-UA-Full-Version',
	'Sec-CH-UA-Full-Version-List',
	'Sec-CH-UA-Mobile',
	'Sec-CH-UA-Model',
	'Sec-CH-UA-Platform',
	'Sec-CH-UA-Platform-Version',
	'Sec-CH-UA-WoW64',
];

// Header remove actions, for faster rule creation.
const SEC_CH_ACTIONS = SEC_CH_HEADERS.map(header => {
	return {
		header,
		operation: 'remove',
	}
});

/**
 * Builds a randomized versioned string in the form <product>/<version>.
 * @returns the string.
 */
function buildVersionedName() {
	const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

	let str = LETTERS[(Math.random() * LETTERS.length) | 0].toUpperCase();

	let lowerCount = (8 + 6 * Math.random()) | 0;
	while (lowerCount--) {
		str += LETTERS[(Math.random() * LETTERS.length) | 0];
	}

	str += '/';
	str += (Math.random() * 100) | 0;
	if (Math.random() < 0.5) {
		str += '.';
		str += (Math.random() * 100) | 0;
	}

	return str;
}

/**
 * Builds a random, fake user agent.
 * @returns the fake user agent.
 */
function buildFakeUA() {
	let partsCount = (3 + 3 * Math.random()) | 0;
	const parts = [];

	while (partsCount--) {
		parts.push(buildVersionedName());
	}

	return `${buildVersionedName()} (${parts.join('; ')})`;
}

/**
 * Callback for webRequest onBeforeRequest event.
 *
 * It checks if there is a rule for the current hosts, an adds a new one if not.
 *
 * @param details current web request details.
 */
const beforeRequestCallback = async (details) => {
	const host = new URL(details.url).host;
	if (modifiedHosts.has(host)) {
		return;
	}

	console.log(`Adding rule #${ruleCounter} for ${host}`);

	/*
	 * Important - we have to add it to the list BEFORE issuing the asynchronous
	 * updateSessionRules, else there are concurrency issues.
	 */
	if (modifiedHostsList.length < MAX_RULE_COUNT) {
		// If we're not at the limit yet, just add a new one
		modifiedHosts.add(host);
		modifiedHostsList.push(host);
	} else {
		// Else replace oldest host
		modifiedHosts.delete(modifiedHostsList[ruleCounter]);
		modifiedHosts.add(host);
		modifiedHostsList[ruleCounter] = host;
	}

	const rule = {
		id: RULE_OFFSET + ruleCounter,
		priority: 1,
		action: {
			type: 'modifyHeaders',
			requestHeaders: [
				{
					header: 'User-Agent',
					operation: 'set',
					value: buildFakeUA()
				},
				...SEC_CH_ACTIONS
			]
		},
		condition: {
			urlFilter: `||${host}^`,
			/*
			 * We need to specify, for some reason, all possible types. Else the rule will not
			 * work, at least as of Chrome 138.
			 */
			resourceTypes: ALL_RESOURCE_TYPES
		}
	};
	ruleCounter = (ruleCounter + 1) % MAX_RULE_COUNT;

	// Nothing happens if we attempt to remove a rule that doesn't exist, so we'll do it always
	await chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [rule.id],
		addRules: [rule],
	});

	// Finally reload tab
	chrome.scripting.executeScript({
		target: {
			tabId: details.tabId
		},
		files: ["reload.js"],
	});
}

// Install request callback
chrome.webRequest.onBeforeRequest.addListener(
	beforeRequestCallback,
	{
		urls: [
			'*://*/.within.website/x/cmd/anubis/*',
			'*://*/.within.website/x/xess/*'
		]
	}
);

/**
 * Callback fired when the extension is installed or updated.
 *
 * It removes all existing session rules to prevent ID clashes, as the session rules are kept
 * between reloads but our poor-man's database of known hosts is not.
 */
const extensionInstalledCallback = async () => {
	console.log('Purging old rules');

	// Remove currently set-up session rules, as they persist between extension reloads.
	const curRules = await chrome.declarativeNetRequest.getSessionRules();
	if (curRules.length) {
		await chrome.declarativeNetRequest.updateSessionRules({
			removeRuleIds: curRules.map(x => x.id),
		});
	}
};

// Install extension installed/updated callback
chrome.runtime.onInstalled.addListener(extensionInstalledCallback);
