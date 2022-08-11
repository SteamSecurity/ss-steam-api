// This script is the full and all around testing script for this package.
// Steam API Terms requires the applicants not share API keys with a third party, this includes Source Repos
// Because of this limitation (and other reasons that should hopefully be obvious) this script must be ran locally using your own Steam Web API Key
// https://steamcommunity.com/dev/apiterms

const steamapi = require('./index');
const { printTable, Table } = require('console-table-printer');
require('dotenv').config();

// This is our sample set for users in the form of SteamID64s
// Some of these are notable figures in the Steam trading community
// As such, they are expected to be guaranteed to have a "public" profile.
// Some others are banned in one way or another
// Needless to say, please do not go out of your way to contact these accounts or the individuals who run them.
const steamid64_sample_list = [
	'76561198154631702',
	'76561197960434622',
	'76561198090658171',
	'76561198032131059',
	'765611980521164051', // This one is an invalid SteamID64, but don't tell our tester function about that!
	'10101010101', // Same with this
	'76561197968633696',
	'76561198127443225',
	'76561198041979561',
	'76561197983505462',
	'76561197983505462', // Duplicate to test caching
];

// Set our SteamAPI key using dotenv or GitLab secret variable
steamapi.steam_api_key = process.env.STEAMAPI;

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
	for (steamid64 of steamid64_sample_list) {
		await steamapi.getReputation(steamid64).then(checkReputationResponse);
	}

	// Test the "getProfile" API
	for (steamid64 of steamid64_sample_list) {
		await steamapi.getProfile(steamid64).then(checkProfileResponse);
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
