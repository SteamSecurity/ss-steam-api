// This script is the full and all around testing script for this package.
// Steam API Terms requires the applicants not share API keys with a third party, this includes Source Repos.
// Because of this limitation (and other reasons that should hopefully be obvious) this script must be ran locally using your own Steam Web API Key
// https://steamcommunity.com/dev/apiterms

// Import modules ----------------------------------------------------
// Development modules
const { printTable, Table } = require('console-table-printer');
require('dotenv').config();
const steamapi = new (require('./index'))({ key: process.env.STEAMAPI, debug: true });

// Set variables -----------------------------------------------------
// Table variables -----
// These store the results that we will present at the end.
let reputation_table;
let profile_table;
let vanity_table;
let getsteamid_table;
// Set sample set
const sample_steamid64 = [
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
	'76561198968664564',
	'76561198381538647',
];
const sample_vanity = ['_armoreddragon_', 'EvilPeople', 'redwine', 'a', 'therealbuzzlightyear'];
const sample_steamid3 = ['[U:1:130392443]', '[U:1:36603369]', '[U:1:23239734]', '[U:1:194365974]'];
const sample_steamid2 = ['STEAM_0:0:97182987', 'STEAM_0:0:67393619', 'STEAM_0:0:19382867', 'STEAM_0:0:10907327', 'STEAM_0:0:176367228'];

// Testing function --------------------------------------------------
async function testReputation() {
	// Build tables to display results -----------
	reputation_table = new Table({
		columns: [
			{ name: 'status', title: 'Status', alignment: 'center' },
			{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
		],
	});
	for (steamid64 of sample_steamid64) {
		await steamapi
			.getReputation(steamid64)
			.then((response) => checkResponse('getReputation', response))
			.then((response) => addSuccess(reputation_table, response))
			.catch((reason) => addSuccess(reputation_table, reason));
	}
}
async function testProfile() {
	// Build tables to display results -----------
	profile_table = new Table({
		columns: [
			{ name: 'status', title: 'Status', alignment: 'center' },
			{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
			{ name: 'persona_name', title: 'Persona Name', alignment: 'center' },
			{ name: 'privacy', title: 'Privacy', alignment: 'center' },
		],
	});

	for (steamid64 of sample_steamid64) {
		await steamapi
			.getProfile(steamid64)
			.then((response) => checkResponse('getProfile', response))
			.then((response) => addSuccess(profile_table, response))
			.catch((reason) => addSuccess(profile_table, reason));
	}
}
async function testVanityURL() {
	// Build tables to display results -----------
	vanity_table = new Table({
		columns: [
			{ name: 'status', title: 'Status', alignment: 'center' },
			{ name: 'vanity', title: 'Vanity', alignment: 'center' },
			{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
		],
	});

	for (vanity of sample_vanity) {
		await steamapi
			.resolveVanityURL(vanity)
			.then((response) => checkResponse('resolveVanityURL', response))
			.then((response) => addSuccess(vanity_table, { ...response, vanity: vanity }))
			.catch((reason) => addSuccess(vanity_table, reason));
	}
}
async function testGetSteamID64() {
	// Build tables to display results -----------
	getsteamid_table = new Table({
		columns: [
			{ name: 'status', title: 'Status', alignment: 'center' },
			{ name: 'search', title: 'Search', alignment: 'center' },
			{ name: 'steamid64', title: 'SteamID64', alignment: 'center' },
		],
	});

	for (steamid64 of sample_steamid64) {
		await steamapi
			.getSteamID64(steamid64)
			.then((response) => checkResponse('getSteamID64', response))
			.then((response) => addSuccess(getsteamid_table, { ...response, search: steamid64 }))
			.catch((reason) => addSuccess(getsteamid_table, { ...reason, search: steamid64 }));
	}
	for (vanity of sample_vanity) {
		await steamapi
			.getSteamID64(vanity)
			.then((response) => checkResponse('getSteamID64', response))
			.then((response) => {
				addSuccess(getsteamid_table, { ...response, search: vanity });
			})
			.catch((reason) => addSuccess(getsteamid_table, { ...reason, search: vanity }));
	}
	for (steamid3 of sample_steamid3) {
		await steamapi
			.getSteamID64(steamid3)
			.then((response) => checkResponse('getSteamID64', response))
			.then((response) => addSuccess(getsteamid_table, { ...response, search: steamid3 }))
			.catch((reason) => addSuccess(getsteamid_table, { ...reason, search: steamid3 }));
	}
	for (steamid2 of sample_steamid2) {
		await steamapi
			.getSteamID64(steamid2)
			.then((response) => checkResponse('getSteamID64', response))
			.then((response) => addSuccess(getsteamid_table, { ...response, search: steamid2 }))
			.catch((reason) => addSuccess(getsteamid_table, { ...reason, search: steamid2 }));
	}
}

// Helper Functions --------------------------------------------------
function checkResponse(endpoint, response) {
	return new Promise((resolve) => {
		for (key of Object.keys(response)) {
			if (typeof response[key] === 'undefined') throw new Error(`Error in ${endpoint}`);
		}
		resolve(response);
	});
}
function addSuccess(table, response) {
	let color = 'green';
	let status = 'Good';
	if (response.error_message) {
		color = 'yellow';
		status = 'Caught';
	}
	table.addRow({ ...response, status: status }, { color: color });
}

// Master controller -------------------------------------------------
testReputation()
	.then(testProfile)
	.then(testVanityURL)
	.then(testGetSteamID64)
	.then(() => {
		reputation_table.printTable();
		profile_table.printTable();
		vanity_table.printTable();
		getsteamid_table.printTable();
	});
