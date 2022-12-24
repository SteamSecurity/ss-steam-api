const axios = require('axios').default;
const xml_parser = require('xml2json');
const SteamID = require('steamid');
let log;
try {
	log = require('easy-logger');
} catch {}

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

let cache = { reputation: {}, profile: {}, vanity: {} };

class SteamAPI {
	constructor({ timeout = 5000, cache_time = 1800000, cache_results = true, key = null, debug = false } = {}) {
		if (!key) console.log('A Steam Web API key has not been set in SS-Steam-API. Please supply one.');

		this.timeout = timeout;
		this.cache_time = cache_time;
		this.cache_results = cache_results;
		this.key = key;
		this.debug = debug;
	}

	/**
	 * Fetch the reputation information of a Steam user from Steam services.
	 * @param {String} steamid64 SteamID64 of the user to request
	 * @returns {Promise} A completed promise returns all available information about a Steam user
	 */
	getReputation(steamid64) {
		return new Promise(async (resolve, reject) => {
			if (!this.key) return resolve(this._newErrorResponse('Steam Web API key was not supplied. Request was not made.', '1'));

			// Make sure we have a valid SteamID64
			if (!this._isSteamID64(steamid64)) reject(this._newErrorResponse(`${steamid64} not a valid SteamID64`));

			// Check the cache
			if (this.cache_results && cache.reputation[steamid64]) {
				this._debugLog({ data: `${steamid64} reputation was in cache. Resolved.` });
				return resolve(cache.reputation[steamid64]);
			}

			// Get new request ---------------------------------
			let profile_reputation = {
				vac_banned: null,
				number_vac_bans: null,
				economy_banned: null,
				community_banned: null,
				number_game_bans: null,
			};

			const steam_response_raw = await this._get(`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${this.key}&steamids=${steamid64}`);

			// Quick response error check
			if (steam_response_raw.error) return resolve(this._newErrorResponse(steam_response_raw.error_message, steam_response_raw.error));
			if (steam_response_raw.status !== 200) return resolve(this._newErrorResponse(`Unexpected HTTP status code`, steam_response_raw.error));

			// This API endpoint can only get one player.
			let steam_response = steam_response_raw.data.players[0];

			if (steam_response === undefined) return resolve(this._newErrorResponse(`Steam did not return with a user`, steam_response_raw.status));

			profile_reputation.vac_banned = steam_response.VACBanned;
			profile_reputation.community_banned = steam_response.CommunityBanned;
			profile_reputation.number_vac_bans = steam_response.NumberOfVACBans;
			profile_reputation.number_game_bans = steam_response.NumberOfGameBans;
			steam_response.EconomyBan === 'banned' ? (profile_reputation.economy_banned = true) : (profile_reputation.economy_banned = false);

			// If the script is in debugging more, include the steamid64 in the response
			if (this.debug) profile_reputation.steamid64 = steamid64;

			if (this.cache_results) {
				cache.reputation[steamid64] = profile_reputation;
				this._debugLog({ data: `Cached ${steamid64}'s reputation` });
				setTimeout(() => {
					delete cache.reputation[steamid64];
				}, this.cache_time);
			}

			this._debugLog({ data: `Sending fresh getReputation info out!` });
			return resolve(profile_reputation);
		});
	}

	/**
	 * Get a profile overview from a SteamID64
	 * @param {String} steamid64 SteamID64 of the user to request
	 * @returns {Promise} A completed promise returns all available information about a Steam user's profile
	 */
	getProfile(steamid64) {
		return new Promise(async (resolve, reject) => {
			// Make sure we have a valid SteamID64
			if (!this.key) return resolve(this._newErrorResponse('Steam Web API key was not supplied. Request was not made.', '1'));
			if (!this._isSteamID64(steamid64)) reject(this._newErrorResponse(`${steamid64} not a valid SteamID64`));

			// Check the cache
			if (this.cache_results && cache.profile[steamid64]) {
				this._debugLog({ data: `${steamid64} profile was in cache. Resolved.` });
				return resolve(cache.profile[steamid64]);
			}

			const all_requests = await Promise.all([
				this._get(`https://steamcommunity.com/profiles/${steamid64}/?xml=true`),
				this._get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.key}&steamids=${steamid64}`),
			]);
			const steam_xml_response_full = JSON.parse(xml_parser.toJson(all_requests[0].data, xml2json_options));
			const steam_xml_response = steam_xml_response_full.profile;
			const steam_json_response = all_requests[1].data.response.players[0];

			// TODO: Does this error check even do anything?
			// Check for errors in the requests ------------------
			let xmr_error_message = steam_xml_response_full.response?.error || null;

			if (xmr_error_message === 'The specified profile could not be found.' || !steam_json_response) {
				return resolve(this._newErrorResponse(steam_xml_response_full.response.error, all_requests[0].status));
			}

			let sid = new SteamID(`${steamid64}`);

			let profile = {
				custom_url: objectOrString(steam_xml_response?.customURL) || null,
				url: `https://steamcommunity.com/profiles/${steamid64}`,
				persona_name: steam_xml_response?.steamID || steam_json_response?.personaname || null,
				in_game: false, // Will be set later
				game_info: null, // Will be set later
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
				location: objectOrString(steam_xml_response?.location) || null,
				real_name: objectOrString(steam_xml_response?.realname) || null,
				// TODO: Banned users have a comment_permissions of 2?
				// Are comment permissions documented incorrectly, and instead of being publicly allowed to or not, the value represents comment posting privacy?
				comment_permissions: steam_json_response?.commentpermission ? true : false,
				steamid2: sid.getSteam2RenderedID(),
				steamid3: sid.getSteam3RenderedID(),
				steamid64: steamid64,
				summary: steam_xml_response.summary,
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

			if (this.cache_results) {
				cache.profile[steamid64] = profile;
				this._debugLog({ data: `Cached ${steamid64}'s profile` });
				setTimeout(() => {
					delete cache.profile[steamid64];
				}, this.cache_time);
			}

			this._debugLog({ data: `Sending fresh getProfile info out!` });
			return resolve(profile);
		});
	}

	/**
	 * Get a SteamID64 from a profile's custom URL
	 * @param {String} search The user's Vanity URL
	 * @returns {Promise} A completed promise returns a SteamID64
	 */
	resolveVanityURL(search) {
		return new Promise(async (resolve, reject) => {
			if (!this.key) return resolve(this._newErrorResponse('Steam Web API key was not supplied. Request was not made.', '1'));
			// Check the cache
			if (this.cache_results && cache.vanity[`${search}`]) {
				this._debugLog({ data: `${search} vanity was in cache. Resolved.` });
				return resolve(cache.vanity[`${search}`]);
			}

			const response = await this._get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${this.key}&vanityurl=${search}`);

			// Check for errors
			if (response.status !== 200) return reject(this._newErrorResponse(response.error_message || 'unexpected error', response.error));
			if (response.data.response.success !== 1) return reject(this._newErrorResponse(response.data.response.message, response.data.response.success));

			const steamid_formatted_response = { steamid64: response.data.response.steamid };

			if (this.cache_results) {
				cache.vanity[`${search}`] = steamid_formatted_response;
				this._debugLog({ data: `Cached ${search}'s Vanity response` });
				setTimeout(() => {
					delete cache.vanity[`${search}`];
				}, this.cache_time);
			}

			this._debugLog({ data: `Sending fresh resolveVanityURL info out!` });
			return resolve(steamid_formatted_response);
		});
	}

	// For this function, we don't need to handle any caching as this relies on an internal function which already caches data as needed
	/**
	 * Convert any SteamID or Vanity URL into a SteamID64.
	 * @param {String} data The data to turn into a SteamID64. Can be any valid SteamID type or a vanity URL part.
	 * @returns {Promise} A completed promise returns a SteamID64.
	 */
	getSteamID64(data) {
		return new Promise(async (resolve, reject) => {
			const regex = {
				sid64: /^765[0-9]{14}$/,
				sid3: /^\[U:1:[0-9]+\]$/,
				sid: /^STEAM_[0-5]:[01]:\d+$/,
			};

			// Check that we got data
			if (!data) reject(this._newErrorResponse('"data" was not supplied.'));

			// Check that "data" is a supported type
			if (typeof data !== 'string') reject(this._newErrorResponse(`Received an unexpected "data" type. Expected "string", got ${typeof data}`));

			// Okay, we got something we are expecting.
			// Test to see if we have a valid SteamID of any type
			if (regex.sid3.test(data) || regex.sid.test(data) || regex.sid64.test(data)) {
				let sid = new SteamID(data);
				resolve({ steamid64: sid.getSteamID64(data) });
			}
			// We don't, resolve vanity URL.
			else {
				this.resolveVanityURL(data)
					.then((response) => resolve(response))
					.catch((reason) => reject(this._newErrorResponse(reason.error_message, reason.error)));
			}
		});
	}

	/**
	 * Create a GET request to a specified URL
	 * @param {String} url The URL to submit a GET request to
	 */
	_get(url) {
		return new Promise((resolve) => {
			axios
				.get(url, { timeout: this.timeout })
				.then(resolve)
				.catch((reason) => {
					resolve({ error: reason.response.status, error_message: reason.message });
				});
		});
	}

	/**
	 * Test if a string is a valid SteamID64
	 * @param {String} id A string of text or numbers to check to see if it is a valid SteamID64.
	 * @returns {Boolean}
	 */
	_isSteamID64(id) {
		if (!id || typeof id !== 'string') return false;
		return /^765[0-9]{14}$/.test(id);
	}

	/**
	 * Quickly format an error response.
	 * @param {String} message A detailed message to rely to the user.
	 * @param {Number} status An error code.
	 * @returns {Object}
	 */
	_newErrorResponse(message, status = 1) {
		return {
			error: status,
			error_message: message,
		};
	}

	/**
	 * A quick little debug logger. :3
	 * @param {Object} [options]
	 * @param {String} [options.data] A message to send to the terminal.
	 * @param {String} [options.title] A header for the output. Disables 'type'.
	 * @param {String} [options.type=debug] The type of log to send.
	 * @returns
	 */
	_debugLog({ data, title, type = 'debg' } = {}) {
		if (!this.debug) return;

		if (title) {
			console.log(`-- ${title} -------------------------------------`);
			console.log(data);
			console.log(`\n\n`);
		} else {
			try {
				log[type](data);
			} catch {
				console.log(data);
			}
		}
	}

	enums = {
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
}

function objectOrString(value) {
	if (typeof value === 'object') {
		return null;
	}
	return value;
}
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

module.exports = SteamAPI;
