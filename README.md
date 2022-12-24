<div align="center">
  <img src="https://raw.githubusercontent.com/SteamSecurity/ss-steam-api/master/images/steam-logo.png" width="750"><br>
  <b>A community made API Wrapper</b>
</div>
<br>
<div align="center">
  <img src="https://img.shields.io/npm/dt/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/github/contributors/steamsecurity/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/github/issues/steamsecurity/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/github/languages/code-size/steamsecurity/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/github/actions/workflow/status/steamsecurity/ss-steam-api/npm-publish.yml?style=for-the-badge">
  
</div>
<br>

# About

SS-Steam-API is a basic wrapper for the Steam API used and maintained by SteamSecurity.org.
Please see [Limitations](#limitations) for further details.

### Installation

`npm i SS-Steam-API`

# Basic usage

```js
// There are two ways to include this module in your project
// The first way is on a single line
const steam = new (require('ss-steam-api'))({ key: STEAM_WEB_API_KEY });
// Alternatively you can do it like this.
const _steamapi_module = require('ss-steam-api');
const steam = new _steamapi_module({ key: STEAM_WEB_API_KEY });

// Once the package is included and properly supplied with a Steam API Key,
// you can immediately use it.
async function getAccountReputation() {
	await steam.getReputation('insert-valid-STEAMID64-here').then(console.log);
}

getAccountReputation();
```

See test.js for more examples.

# Options

These are set using the constructor function when including the module

- ### _key_ (Required)

  Set this value to your Steam Web API Key.
  If left unset, this package will respond with an error alerting you to the missing key.

- ### _timeout_

  Time to wait in milliseconds before canceling the request and returning with an error.

- ### _cache_results_

  A Boolean dictating whether or not automatic caching happens. Typically you do not want to change from the default value 'true', however if you are using your own cache solution, you may want to disable this.

- ### _cache_time_

  Time to save a cached response in milliseconds.
  This is ignored if caching is disabled.

- ### _debug_

  A Boolean controlling whether or not the wrapper will run in debug mode. This is not recommended for production environments as it outputs a lot of text to the console window.

The following code block is an example on how to set up ss-steam-api to have:

- Steam API Key
- Request timeout of 2 seconds
- Not cache results
- Set a cache time to 0 seconds
- Enable debugging mode

```js
const options = {
	key: STEAM_WEB_API_KEY,
	timeout: 2000,
	cache_results: false,
	cache_time: 0,
	debug: true,
};

const _steamapi_module = require('ss-steam-api');
const steam = new _steamapi_module(options);
```

# Methods

- ### getReputation(steamid64)

  - steamid64: A valid steamid64 for any account.

    This returns a promise formatted as such:

    ```js
    {
        vac_banned: Boolean,
        economy_banned: Boolean,
        community_banned: Boolean,
        number_vac_bans: Number,
        number_game_bans: Number
    }
    ```

- ### getProfile(steamid64)

  - steamid64: A valid steamid64 for any account.

    This returns a promise formatted as such:

    ```js
    {
      custom_url: String,
      url: String,
      persona_name: String,
      in_game: Boolean,
      game_info: Object, // Or null if user is not playing a game
      online_state: String,
      privacy: String,
      avatar: String,
      avatar_mid: String,
      avatar_small: String,
      account_limited: String,
      member_since: String, // A human-readable date. Example: 'March 2, 2050'
      profile_created: String, // A Unix timestamp of when the user was created
      location: String,
      real_name: String,
      comment_permissions: Boolean,
      steamid2: String,
      steamid3: String,
      steamid64: String,
      summary: String,
    }
    ```

- ### resolveVanityURL(search)

  - search: The user's Vanity URL.

    This returns a promise formatted as such:

    ```js
    {
      steamid64: String,
    }
    ```

- ### getSteamID64(data)

  - data: The data to turn into a SteamID64. Can be any valid SteamID type or a vanity URL part.

    This returns a promise formatted as such:

    ```js
    {
      steamid64: String,
    }
    ```

# Error Handling

Any errors with the Steam API or this wrapper should resolve the promise with both an 'error' and 'error_message' value.

```js
{
	error: 'Status code. Often a direct HTTP status code, otherwise most likely "1"',
	error_message: 'A more specific error message'
}
```

# Limitations

Some information is not returned to the end user. Some information has been either depreciated by Valve, some have been deemed inconsequential (effective duplicates), and the rest simply does not have support included in this package yet.

Until we reach a version 1.0.0 release, this package is not recommended for production environments. This is released as is in the hope of receiving community feedback and bug reports.

# Disclaimer

SS-Steam-API is still a work-in-progress. There may be breaking changes with every update. This will remain true until our v1.0.0 release. Subsequent releases will be much more mature.
SS-Steam-API is not endorsed or affiliated with Steam or Valve in any way.
Please ensure your use of the Steam Web API is in line with the [Steam API Terms](https://steamcommunity.com/dev/apiterms).
