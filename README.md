<div align="center">
  <img src="https://gitlab.com/steamsecurity/SS-Steam-API/-/raw/master/images/steam-logo.png" width="750"><br>
  <b>A community made API Wrapper</b>
</div>
<br>
<div align="center">
  <img src="https://img.shields.io/npm/dt/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/gitlab/contributors/steamsecurity/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/gitlab/issues/open-raw/steamsecurity/ss-steam-api?style=for-the-badge">
  <img src="https://img.shields.io/gitlab/pipeline-status/steamsecurity/ss-steam-api?branch=master&style=for-the-badge">
</div>
<br>

# About

SS-Steam-API is a basic wrapper for the Steam API used and maintained by SteamSecurity.org.
Please see [Limitations](#limitations) for further details.

### Installation

`npm i SS-Steam-API`

# Basic usage

```js
let steam = require('ss-steam-api');

// Required
steam.steam_api_key = 'A valid Steam API Key'; // Set your Steam Web API Key here.

// Optionally set a timeout to the SteamRep API request.
steam.timeout = 5000; // ms to wait for a response. Default is '5000'

// Optionally set request cache.
steam.cache_results = true; // Should results be cached? Default is 'true'.

// Optionally set a cache time to save requests to prevent spamming of SteamRep servers.
steam.cache_time = 1800000; // ms to save a cached response.  Default is '1800000' (30 minutes)

// Optionally enable debug mode. Not recommended for production.
steam.debug = false; // Should debug mode be enabled? Default is 'false'

async function getAccountReputation() {
	await steam.getReputation('insert-valid-STEAMID64-here').then(console.log);
}

getAccountReputation();
```

See test_local.js for more examples.

# Properties

- ### steam_api_key

  Set this value to your Steam Web API Key.
  If left unset, this package will respond with an error alerting you to the missing key.

- ### timeout

  Time to wait in milliseconds before canceling the request and returning with an error.

- ### cache_results

  A Boolean dictating whether or not automatic caching happens. Typically you do not want to change from the default value 'true', however if you are using your own cache solution, you may want to disable this.

- ### cache_time

  Time to save a cached response in milliseconds.
  This is ignored if caching is disabled.

- ### cache

  This is an object containing the entire cache. This can be retrieved, changed, and then reapplied as needed.

- ### debug

  A Boolean controlling whether or not the wrapper will run in debug mode. This is not recommended for production environments as it outputs a lot of text to the console window.

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
      game_info: Object,
      online_state: String,
      privacy: String,
      avatar: String,
      avatar_mid: String,
      avatar_small: String,
      account_limited: String,
      member_since: String,
      profile_created: Number,
      location: String,
      real_name: String,
      comment_permissions: Boolean
    }
    ```

# Error Handling

Any errors with the Steam API or this wrapper should resolve the promise with both an 'error' and 'error_message' value.

```js
{
	error: 'Status code. Almost always a direct HTTP status code from a request',
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
