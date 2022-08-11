// This script is used to test the package on the pipeline.
// The 'Filler' information was generated using test_local.js on a local machine.
// This is separated from 'test_local.js' for the security of the developers,
// and to be in line with the Steam API Terms.
// https://steamcommunity.com/dev/apiterms

const steamapi = require('./index');
const { printTable, Table } = require('console-table-printer');
require('dotenv').config();

// This is our sample set for users in the form of completed responses.
// Needless to say, please do not go out of your way to contact these accounts or the individuals who run them.
// Please keep these results up to date with test_local.js responses
const reputation_filler_responses = [
	{
		vac_banned: false,
		number_vac_bans: 0,
		economy_banned: false,
		community_banned: false,
		number_game_bans: 0,
		steamid64: '76561197968633696',
	},
	{
		vac_banned: false,
		number_vac_bans: 0,
		economy_banned: false,
		community_banned: true,
		number_game_bans: 0,
		steamid64: '76561198127443225',
	},
	{
		vac_banned: false,
		number_vac_bans: 0,
		economy_banned: false,
		community_banned: true,
		number_game_bans: 0,
		steamid64: '76561197983505462',
	},
];
const profile_filler_responses = [
	{
		custom_url: 'DaddyAlex',
		url: 'https://steamcommunity.com/profiles/76561197968633696',
		persona_name: 'D. Alex',
		in_game: false,
		game_info: {},
		online_state: '1',
		privacy: '3',
		avatar: 'https://avatars.akamai.steamstatic.com/3af37656086a2fcadd0235b5622bbce1e541f9ac_full.jpg',
		avatar_mid: 'https://avatars.akamai.steamstatic.com/3af37656086a2fcadd0235b5622bbce1e541f9ac_medium.jpg',
		avatar_small: 'https://avatars.akamai.steamstatic.com/3af37656086a2fcadd0235b5622bbce1e541f9ac.jpg',
		account_limited: '0',
		member_since: 'September 1, 2004',
		profile_created: 1094061593,
		location: 'REMOVED, United States',
		real_name: 'REMOVED',
		comment_permissions: true,
	},
	{
		custom_url: null,
		url: 'https://steamcommunity.com/profiles/76561198127443225',
		persona_name: '76561198127443225',
		in_game: false,
		game_info: {},
		online_state: '0',
		privacy: '3',
		avatar: 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
		avatar_mid: 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
		avatar_small: 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
		account_limited: '0',
		member_since: 'February 22, 2014',
		profile_created: 1393074013,
		location: null,
		real_name: null,
		comment_permissions: true,
	},
	{
		custom_url: 'tlittle',
		url: 'https://steamcommunity.com/profiles/76561197983505462',
		persona_name: 'Little',
		in_game: false,
		game_info: {},
		online_state: undefined,
		privacy: '3',
		avatar: 'https://avatars.akamai.steamstatic.com/3ec585bcad173e7157fc181ffbd289ae5916f7c6_full.jpg',
		avatar_mid: 'https://avatars.akamai.steamstatic.com/3ec585bcad173e7157fc181ffbd289ae5916f7c6_medium.jpg',
		avatar_small: 'https://avatars.akamai.steamstatic.com/3ec585bcad173e7157fc181ffbd289ae5916f7c6.jpg',
		account_limited: '0',
		member_since: 'July 2, 2006',
		profile_created: 1151849586,
		location: 'REMOVED, Russian Federation',
		real_name: 'REMOVED',
		comment_permissions: true,
	},
];

// Enable debugging more in the steamapi wrapper
steamapi.debug = true;

// Create tables to store our results
let reputation_results = new Table({
	columns: [
		{ name: 'status', title: 'Status', alignment: 'center' },
		{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
	],
});
let profile_results = new Table({
	columns: [
		{ name: 'status', title: 'Status', alignment: 'center' },
		{ name: 'persona_name', title: 'Persona Name', alignment: 'center' },
		{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
	],
});

// Create our test function.
// This is the brains behind our testing. It's main purpose is to make requests, and then check the requests for errors
async function test() {
	// Start a timer to time the total time of time.
	// Also I thought it was cool to include this for S&G.
	console.time('Time to complete');

	// Test the "getReputation" API
	for (response of reputation_filler_responses) {
		checkReputationResponse(response);
	}

	// Test the "getProfile" API
	for (response of profile_filler_responses) {
		checkProfileResponse(response);
	}

	// Print our results to the terminal
	console.log('Reputation Results');
	reputation_results.printTable();
	console.log('\n\n');
	console.log('Profile Results');
	profile_results.printTable();

	// Analyze the results, and return on process error if something did not pass
	checkResults();

	// Final time!
	console.timeEnd(`Time to complete`);
	process.exit(0);
}

function checkReputationResponse(data) {
	let test_result = { status: null, steamid64: null };
	let result_color = null;

	// Any SteamID64 related errors were caught successfully.
	if (typeof data.error === 'number' && data.error_message) {
		test_result.status = 'Error';
		result_color = 'yellow';
		reputation_results.addRow(test_result, { color: result_color });
		return;
	}

	if (typeof data.vac_banned !== 'boolean') test_result.status = 'Failed';
	if (typeof data.number_vac_bans !== 'number') test_result.status = 'Failed';
	if (typeof data.economy_banned !== 'boolean') test_result.status = 'Failed';
	if (typeof data.community_banned !== 'boolean') test_result.status = 'Failed';
	if (typeof data.number_game_bans !== 'number') test_result.status = 'Failed';

	test_result.steamid64 = data.steamid64;

	if (test_result.status === null) {
		test_result.status = 'Passed';
		result_color = 'green';
	} else {
		result_color = 'red';
	}

	reputation_results.addRow(test_result, { color: result_color });
}

function checkProfileResponse(data) {
	let test_result = { status: null, persona_name: null, steamid64: null };
	let result_color = null;

	// Any SteamID64 related errors were caught successfully.
	if (typeof data.error === 'number' && data.error_message) {
		test_result.status = 'Error';
		result_color = 'yellow';
		profile_results.addRow(test_result, { color: result_color });
		return;
	}

	if (!data) test_result.status = 'Failed';
	if (!data?.persona_name) test_result.status = 'Failed';
	if (!data?.online_state) test_result.status = 'Failed';
	if (!data?.privacy) test_result.status = 'Failed';

	test_result.steamid64 = data?.url?.replace('https://steamcommunity.com/profiles/', '') || null;
	test_result.persona_name = data?.persona_name || null;

	if (test_result.status === null) {
		test_result.status = 'Passed';
		result_color = 'green';
	} else {
		result_color = 'red';
	}

	profile_results.addRow(test_result, { color: result_color });
}

function checkResults() {
	reputation_results.table.rows.forEach((result) => {
		if (result.text.status === 'Failed') throw new Error('Pipeline Failed');
	});
	profile_results.table.rows.forEach((result) => {
		if (result.text.status === 'Failed') throw new Error('Pipeline Failed');
	});
}
test();
