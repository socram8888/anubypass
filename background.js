
// Offset for known rules
const KNOWN_HOST_RULE_OFFSET = 100;

// Known hosts using the protection
const KNOWN_HOSTS = [
	// STARTS KNOWN HOSTS
	'archives.lib.duke.edu',
	'bugs.scummvm.org',
	'bugs.winehq.org',
	'builder.sourceware.org',
	'canine.tools',
	'catgirl.click',
	'cfaarchive.org',
	'clew.se',
	'code.hackerspace.pl',
	'codeberg.org',
	'coinhoards.org',
	'dev.sanctum.geek.nz',
	'ebird.org',
	'extensions.typo3.org',
	'fabulous.systems',
	'find.library.duke.edu',
	'forum.freecad.org',
	'forums.scummvm.org',
	'gcc.gnu.org',
	'git.aya.so',
	'git.devuan.org',
	'git.enlightenment.org',
	'git.kernel.org',
	'git.lupancham.net',
	'gitea.com',
	'gitlab.freedesktop.org',
	'gitlab.gnome.org',
	'gitlab.postmarketos.org',
	'hebis.de',
	'hofstede.io',
	'hosted.weblate.org',
	'hydra.nixos.org',
	'indiemag.fr',
	'jaredallard.dev',
	'karla.hds.hebis.de',
	'linktaco.com',
	'lore.kernel.org',
	'mozillazine.org',
	'nicholas.duke.edu',
	'openwrt.org',
	'patchwork.sourceware.org',
	'pluralpedia.org',
	'policytoolbox.iiep.unesco.org',
	'reactos.org',
	'reddit.nerdvpn.de',
	'repositorio.ufrn.br',
	'repository.duke.edu',
	'rpmfusion.org',
	'scioly.org',
	'source.puri.sm',
	'sourceware.org',
	'squirreljme.cc',
	'superlove.sayitditto.net',
	'svnweb.freebsd.org',
	'trac.ffmpeg.org',
	'tufind.hds.hebis.de',
	'tumfatig.net',
	'ubmr.hds.hebis.de',
	'wiki.archlinux.org',
	'wiki.freecad.org',
	'wiki.freepascal.org',
	'wiki.scummvm.org',
	'xeiaso.net',
	// ENDS KNOWN HOSTS
];

// Hosts where enabling the protection would break the site
const DISABLED_HOSTS = new Set([
	'canine.tools',
]);

// First rule ID for session rules.
const AUTO_RULE_OFFSET = 200;

// Max number of automatic session rules
const AUTO_RULE_LIMIT = 1000;

// Next rule ID to insert
let autoRuleCounter = 0;

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
 * Builds a new rule for the given host.
 * @param host host to create a rule for.
 * @param id rule id.
 * @returns a new rule object.
 */
function buildRuleForHost(host, id) {
	return {
		id,
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
	}
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
	if (modifiedHosts.has(host) || DISABLED_HOSTS.has(host)) {
		return;
	}

	console.log(`Adding automatic #${autoRuleCounter} for ${host}`);

	const rule = buildRuleForHost(host, AUTO_RULE_OFFSET + autoRuleCounter);
	autoRuleCounter = (autoRuleCounter + 1) % AUTO_RULE_LIMIT;

	/*
	 * Important - we have to add it to the list BEFORE issuing the asynchronous
	 * updateSessionRules, else there are concurrency issues.
	 */
	if (modifiedHostsList.length < AUTO_RULE_LIMIT) {
		// If we're not at the limit yet, just add a new one
		modifiedHosts.add(host);
		modifiedHostsList.push(host);
	} else {
		// Else replace oldest host
		modifiedHosts.delete(modifiedHostsList[autoRuleCounter]);
		modifiedHosts.add(host);
		modifiedHostsList[autoRuleCounter] = host;
	}

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
	const oldRules = (await chrome.declarativeNetRequest.getSessionRules()).map(x => x.id);

	// Directly add rules for known hosts
	const newKnownRules = [];
	for (const host of KNOWN_HOSTS) {
		if (!DISABLED_HOSTS.has(host)) {
			console.log(`Adding known #${newKnownRules.length} for ${host}`);
			modifiedHosts.add(host);
			newKnownRules.push(buildRuleForHost(host, KNOWN_HOST_RULE_OFFSET + newKnownRules.length));
		}
	}

	await chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: oldRules,
		addRules: newKnownRules,
	});
};

// Install extension installed/updated callback
chrome.runtime.onInstalled.addListener(extensionInstalledCallback);
