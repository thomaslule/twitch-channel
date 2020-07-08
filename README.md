# twitch-channel

A small library to listen to various events that can happen on a twitch channel (chat messages, hosts, donations, raids, subscriptions…)

You just have to provide the config and make your app reachable from the internet, this library connects to the chat and subscribes to webhooks.

The event objects are kept simple and without surprises. Every viewer-related event will have the twitch id and the current display name in `viewerId` and `viewerName` fields.

## Example

```javascript
const { TwitchChannel } = require("twitch-channel");

const channel = new TwitchChannel({
  channel: "your_channel",
  client_id: "your_app_id",
  client_secret: "your_app_secret",
  bot_name: "your_bot",
  bot_token: "oauth:your_bot_token",
});

channel.on("subgift", ({ viewerName, recipientName }) => {
  console.log(`${viewerName} just subgifted ${recipientName}`);
});
channel.on("error", (err) => console.error(err));

await channel.connect();
```

## Config options

### Mandatory config

| Config name   | Type   | Description                                                                                               |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| channel       | string | the channel you want to observe                                                                           |
| client_id     | string | get it by registering a twitch app https://dev.twitch.tv/dashboard/apps/create (Redirect URI is not used) |
| client_secret | string | secret of your registered twitch app                                                                      |

### IRC config

Optional config used for events:

- chat
- cheer
- sub
- resub
- subgift
- raid
- ban

| Config name | Type   | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| bot_name    | string | twitch bot login                                   |
| bot_token   | string | create your token here https://twitchapps.com/tmi/ |

### Broadcaster IRC config

If you want to catch the `host` event, you must provide a token from the broadcaster account.

Optional config used for events:

- host

| Config name           | Type   | Description                                                                      |
| --------------------- | ------ | -------------------------------------------------------------------------------- |
| broadcaster_bot_token | string | create your token here https://twitchapps.com/tmi/ (use the broadcaster account) |

### Webhook config

Optional config used for events:

- follow
- stream-begin
- stream-change-game
- stream-end

| Config name  | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| callback_url | string | url to your server, accessible from the internet |
| port         | string | defaults to 80, the lib will listen to this port |

## Events

```javascript
channel.on("debug", (msg) => console.log(msg));
channel.on("info", (msg) => console.log(msg));
channel.on("error", (err) => console.error(err));

channel.on("chat", ({ viewerId, viewerName, message }) => {});
channel.on("cheer", ({ viewerId, viewerName, amount, message }) => {});
// for subs/resubs/subgifts, plan === "1000", "2000", "3000" or "Prime". See msg-param-sub-plan here https://dev.twitch.tv/docs/irc/tags/#usernotice-twitch-tags
channel.on("sub", ({ viewerId, viewerName, message, plan, planName }) => {});
channel.on(
  "resub",
  ({ viewerId, viewerName, message, months, plan, planName }) => {}
);
channel.on(
  "subgift",
  ({ viewerId, viewerName, recipientId, recipientName, plan, planName }) => {}
);
channel.on("host", ({ viewerId, viewerName, viewers, autohost }) => {});
channel.on("raid", ({ viewerId, viewerName, viewers }) => {});
channel.on("follow", ({ viewerId, viewerName }) => {});
// you need to make the bot moderator of the channel to catch "ban" events
channel.on("ban", ({ viewerId, viewerName }) => {});
channel.on("stream-begin", ({ game }) => {});
channel.on("stream-change-game", ({ game }) => {});
channel.on("stream-end", () => {});
```

TwichChannel is an `EventEmitter`, you can use all of its methods too.

You **should** set a listener for `error` otherwise it will throw on errors: https://nodejs.org/api/events.html#events_error_events

## Methods

```javascript
await channel.connect();

await channel.disconnect();
```

## Upgrade from v0 to v1

- we dont use streamlabs anymore, the `streamlabs/donation` event wont fire and the `streamlabs_socket_token` and `is_test` properties have been removed
- to catch the `host` event, you must now provide the `broadcaster_bot_token` config
- the `host` event is now also fired with auto-hosts, it has a new `autohost` boolean property
- the `say` and `getTopClipper` functions have been removed
