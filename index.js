const axios = require('axios').default;
const xml_parser = require('xml2json');

// -- XML parser settings -----
const xml2json_options = {
	object: false,
	reversible: false,
	coerce: false,
	sanitize: true,
	trim: true,
	arrayNotation: false,
	alternateTextNode: false,
};

let SteamAPI = {
	timeout: 5000,
	cache_results: true,
	cache_time: 1800000, // Default time is 30 minutes.
	cache: {
		reputation: {},
		profile: {},
	},
	steam_api_key: null,
	debug: false,
};

SteamAPI.getReputation = function (steamid64) {
	return new Promise(async (resolve) => {
		// API Key check -----------------------------------
		// If the Steam API key is not set, immediately error.
		if (!SteamAPI.steam_api_key) {
			return resolve({
				error: 0,
				error_message: 'Steam Web API key has not been set. Please read the documentation for instructions.',
			});
		}

		// Basic check to make sure we have a valid SteamID64
		if (!isSteamID64(steamid64)) {
			return resolve({ error: 0, error_message: 'Not a valid SteamID64' });
		}

		// Cache -------------------------------------------
		// First, check to see if we have their information cached.
		if (SteamAPI.cache_results && SteamAPI.cache.reputation[steamid64]) {
			debuglog(SteamAPI.cache.reputation[steamid64], 'Cached information');
			return resolve(SteamAPI.cache.reputation[steamid64]);
		}

		// Get new request ---------------------------------
		// Nothing in our cache :(. Time to send a new request!
		let profile_reputation = {
			vac_banned: false,
			number_vac_bans: 0,
			economy_banned: false,
			community_banned: false,
			number_game_bans: 0,
		}; // Our response object. This is what we will be changing with the values we get from Steam.
		const steam_response_raw = await get(
			`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${SteamAPI.steam_api_key}&steamids=${steamid64}`
		); // Our HTTP request. We do not want to alter this value once we get it!

		if (steam_response_raw.error) return resolve({ error: steam_response_raw.error, error_message: steam_response_raw.error_message });
		if (steam_response_raw.status !== 200) return resolve({ error: steam_response_raw.status, error_message: 'Unexpected HTTP status code' });

		// Formatting --------------------------------------
		debuglog(steam_response_raw, 'Steam Response');
		debuglog(steam_response_raw.response.players[0], 'Focused Steam Response');

		// Format the "get" for this request
		let steam_response = steam_response_raw.response.players[0];

		// Error! We didn't get a user returned!
		if (steam_response === undefined) {
			return resolve({ error: steam_response_raw.status, error_message: 'Steam did not return with a user' });
		}

		// Set the values on our return function
		profile_reputation.vac_banned = steam_response.VACBanned;
		profile_reputation.community_banned = steam_response.CommunityBanned;
		profile_reputation.number_vac_bans = steam_response.NumberOfVACBans;
		profile_reputation.number_game_bans = steam_response.NumberOfGameBans;
		if (steam_response.EconomyBan === 'banned') profile_reputation.community_banned = true;

		// Cache the finial result
		if (SteamAPI.cache_results) {
			SteamAPI.cache.reputation[steamid64] = profile_reputation;
			setTimeout(() => {
				delete SteamAPI.cache.reputation[steamid64];
			}, SteamAPI.cache_time);
		}

		// If the script is in debugging more, include the steamid64 in the response
		if (SteamAPI.debug) profile_reputation.steamid64 = steamid64;

		debuglog(profile_reputation, 'Data to send out');

		// Resolution --------------------------------------
		// Give the user the final results.
		return resolve(profile_reputation);
	});
};

SteamAPI.getProfile = function (steamid64) {
	return new Promise(async (resolve) => {
		// API Key check -----------------------------------
		// If the Steam API key is not set, immediately error.
		if (!SteamAPI.steam_api_key) {
			return resolve({
				error: 0,
				error_message: 'Steam Web API key has not been set. Please read the documentation for instructions.',
			});
		}

		// Basic check to make sure we have a valid SteamID64
		if (!isSteamID64(steamid64)) {
			return resolve({ error: 0, error_message: 'Not a valid SteamID64' });
		}

		// Cache -------------------------------------------
		// First, check to see if we have their information cached.
		if (SteamAPI.cache_results && SteamAPI.cache.profile[steamid64]) {
			debuglog(SteamAPI.cache.profile[steamid64], 'Cached information');
			return resolve(SteamAPI.cache.profile[steamid64]);
		}

		// Get new request ---------------------------------
		// Nothing in our cache :(. Time to send a new request!

		// Steam has two API endpoints, each share a lot of information, but some is exclusive to either endpoint
		// The XML endpoint has more community focused information, while the JSON endpoint has more general information.
		// We want it all!.
		const all_requests = await Promise.all([
			get(`https://steamcommunity.com/profiles/${steamid64}/?xml=true`),
			get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${SteamAPI.steam_api_key}&steamids=${steamid64}`),
		]);
		const steam_xml_response_full = JSON.parse(xml_parser.toJson(all_requests[0].response, xml2json_options));
		const steam_xml_response = steam_xml_response_full.profile;
		const steam_json_response = all_requests[1].response.response.players[0];

		// Check for errors in the requests ------------------
		let xmr_error_message = steam_xml_response_full.response?.error || null;

		if (xmr_error_message === 'The specified profile could not be found.' || !steam_json_response) {
			return resolve({ error: all_requests[0].status, error_message: steam_xml_response_full.response.error });
		}

		let profile = {
			custom_url: objectOrString(steam_xml_response?.customURL) || null,
			url: `https://steamcommunity.com/profiles/${steamid64}`,
			persona_name: steam_xml_response?.steamID || steam_json_response?.personaname || null,
			in_game: false, // Will be set later
			game_info: {}, // Will be set later
			// steam_xml_response will return with 'in-game' when a user is in a game.
			// We will treat this as "Online" in this object and handle game info with 'in_game' and 'game_info'.
			online_state: `${private_enums.onlineState[steam_xml_response?.onlineState]}` || `${steam_json_response?.personastate}` || null,
			privacy: `${private_enums.privacyState[steam_xml_response?.privacyState]}` || `${steam_json_response?.communityvisibilitystate}` || null,
			avatar: steam_xml_response?.avatarFull || steam_json_response?.avatarfull || null,
			avatar_mid: steam_xml_response?.avatarMedium || steam_json_response?.avatarmedium || null,
			avatar_small: steam_xml_response?.avatarIcon || steam_json_response?.avatar || null,
			account_limited: steam_xml_response?.isLimitedAccount || null,
			member_since: steam_xml_response?.memberSince || null,
			profile_created: steam_json_response?.timecreated || null,
			// headline: objectOrString(steam_xml_response?.headline) || null, // FIXME: It looks like this is only used for groups, if at all?
			location: objectOrString(steam_xml_response?.location),
			real_name: objectOrString(steam_xml_response?.realname),
			// TODO: Banned users have a comment_permissions of 2?
			comment_permissions: steam_json_response?.commentpermission ? true : false,
		};

		// Handle the search target's game information if they are playing a game
		if (steam_xml_response?.onlineState === 'in-game') {
			profile.in_game = true;
			profile.game_info = {
				name: steam_xml_response?.inGameInfo.gameName,
				appid: steam_xml_response?.inGameInfo.gameLink.replace('https://steamcommunity.com/app/', ''), //TODO: Maybe replace this with REGEX?
				icon: steam_xml_response?.inGameInfo.gameIcon,
				logo: steam_xml_response?.inGameInfo.gameLogo,
				logo_small: steam_xml_response?.inGameInfo.gameLogoSmall,
			};
		}

		debuglog(steam_xml_response, 'XML Information');
		debuglog(steam_json_response, 'JSON Information');

		if (SteamAPI.cache_results) {
			SteamAPI.cache.profile[steamid64] = profile;
			setTimeout(() => {
				delete SteamAPI.cache.profile[steamid64];
			}, SteamAPI.cache_time);
		}

		resolve(profile);

		debuglog(profile, 'Return Information');
	});
};

SteamAPI.enums = {
	community_privacy: {
		0: 'Invalid',
		1: 'Private',
		2: 'Friends Only',
		3: 'Public',

		Public: 3,
		'Friends Only': 2,
		Private: 1,
		Invalid: 0,
	},
	online_state: {
		0: 'Offline',
		1: 'Online',
		2: 'Busy',
		3: 'Away',
		4: 'Snooze',
		5: 'Looking To Trade',
		6: 'Looking To Play',
		7: 'Invisible',
		8: 'Max', // WTF is a max?

		Max: 8,
		Invisible: 7,
		'Looking To Play': 6,
		'Looking To Trade': 5,
		Snooze: 4,
		Away: 3,
		Busy: 2,
		Online: 1,
		Offline: 0,
	},
};

// We want to make sure there is only one form of each word floating around in the script and delivered to the user.
// The end user, should they want to, will use the public SteamAPI.enums for their conversions.
const private_enums = {
	onlineState: {
		offline: 0,
		online: 1,
		'in-game': 1,
	},
	privacyState: {
		invalid: 0,
		private: 1,
		friendsonly: 2,
		public: 3,
	},
};

// --- Helper Functions ------------------------------------
function get(url) {
	return new Promise((resolve) => {
		axios
			.get(url, { timeout: SteamAPI.timeout })
			.then((response) => {
				let status = response.status;
				let res = response.data;
				resolve({ status: status, response: res });
			})
			.catch((reason) => {
				resolve({ error: reason.response.status, error_message: reason.message });
			});
	});
}

function isSteamID64(id) {
	if (!id || typeof id !== 'string') {
		return false;
	}
	return /^765[0-9]{14}$/.test(id);
}

function objectOrString(value) {
	if (typeof value === 'object') {
		return null;
	}
	return value;
}

// Our fun little debug logger function. Be nice to him! :3c
function debuglog(data, title) {
	if (!SteamAPI.debug) return;

	if (title) console.log(`-- ${title} -------------------------------------`);
	console.log(data);
	if (title) console.log(`\n\n`);
}

module.exports = SteamAPI;
