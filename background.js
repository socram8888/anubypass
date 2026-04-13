
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

const UPDATE_RULES_ALARM_NAME = 'update-rules-alarm';

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

	// Remove "bot", just in case
	str = str.replace(/(bo)t/gi, (_, start) => `${start}x`);

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
const updateRules = async () => {
	console.debug('Now updating rules');

	// Fetch the hosts list from the remote JSON file
	let hostsList;
	try {
		const response = await fetch('https://raw.githubusercontent.com/socram8888/anubypass/refs/heads/master/hosts.json');
		if (!response.ok) {
			console.error('Failed to fetch hosts.json:', response.statusText);
			return;
		}
		hostsList = await response.json();
	} catch (error) {
		console.error('Error fetching hosts.json:', error);
		return;
	}

	// Sanity check
	if (!Array.isArray(hostsList) || !hostsList.every(host => typeof host === 'string' && host.includes('.'))) {
		console.error('Fetched hosts.json with an invalid format');
		return;
	}

	console.debug('Fetched', hostsList.length, 'domains');

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

	// Remove currently set-up dynamic rules
	const oldRules = (await chrome.declarativeNetRequest.getDynamicRules()).map(x => x.id);
	console.debug('Old rules IDs:', oldRules);

	// Create a single rule with all domains
	const newRule = {
		id: 1,
		priority: 1,
		action: {
			type: 'modifyHeaders',
			requestHeaders,
		},
		condition: {
			resourceTypes: ALL_RESOURCE_TYPES,
			requestDomains: hostsList
		}
	};
	console.debug('New rule:', newRule);

	// Update dynamic rules (they persist between browser restarts)
	try {
		await chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: oldRules,
			addRules: [newRule],
		});
	} catch (e) {
		console.error('Failed to update rules:', e);
		return;
	}

	console.info('Updated rules successfully');
};

// Update rules on alarm
chrome.alarms.onAlarm.addListener(updateRules);

/**
 * Configures the update rules alarm, if not already configured.
 */
const setupAlarm = async () => {
	const alarm = await chrome.alarms.get(UPDATE_RULES_ALARM_NAME);
	if (!alarm) {
		console.debug('Alarm was not set up - setting up updates');

		// Fire initial rule fetch
		await updateRules();

		// Then schedule updates every 4 hours
		await chrome.alarms.create(UPDATE_RULES_ALARM_NAME, { periodInMinutes: 4 * 60 });
	}
}

// Setup alarm on install, update or start
chrome.runtime.onStartup.addListener(setupAlarm);
chrome.runtime.onInstalled.addListener(setupAlarm);
