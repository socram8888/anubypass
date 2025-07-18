
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
 * Callback to setup the randomized User-Agent for the Anubis-protected hosts.
 */
const setupRules = async () => {
	// Remove currently set-up session rules, as they persist between extension reloads.
	const oldRules = (await chrome.declarativeNetRequest.getSessionRules()).map(x => x.id);
	console.log('Old rules:', oldRules);

	const requestHeaders = [
		// Set User-Agent to a random one
		{
			header: 'User-Agent',
			operation: 'set',
			value: buildFakeUA()
		},

		// Remove all Sec-CH headers
		...SEC_CH_HEADERS.map(header => {
			return {
				header,
				operation: 'remove',
			}
		}),
	];

	const newRule = {
		id: 1,
		priority: 1,
		action: {
			type: 'modifyHeaders',
			requestHeaders,
		},
		condition: {
			/*
			 * We need to specify, for some reason, all possible types. Else the rule will not
			 * work, at least as of Chrome 138.
			 */
			resourceTypes: ALL_RESOURCE_TYPES,
			/*
			 * Note we do not perform any hostname filtering - this rule will only apply on hosts
			 * that are listed in the manifest.json, so no need to add them here too.
			 */
		}
	};

	await chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: oldRules,
		addRules: [newRule],
	});
};

// Install extension installed/updated callback
chrome.runtime.onStartup.addListener(setupRules);
chrome.runtime.onInstalled.addListener(setupRules);
