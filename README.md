# twitch-channel

A small library to listen to various events that can happen on a twitch channel (chat messages, hosts, donations, raids, subscriptions…)

You just have to provide the config options and make your app reachable from the internet, this library connects to the chat, subscribes to webhooks, listen to streamlabs socket. It provides a nice abstraction layer for the various twitch APIs.

## The good things

The event objects are kept simple and without surprises.

Every viewer-related event will have the twitch id and the current display name in `viewerId` and `viewerName` fields.

Streamlabs socket notifications (host and donation) are often sent twice by streamlabs, this library takes care of that.

## Initialization

```javascript
const { TwitchChannel } = require("twitch-channel");

const channel = new TwitchChannel({
  channel: "your_channel",
  bot_name: "", // twitch bot login
  bot_token: "", // create your token here https://twitchapps.com/tmi/
  client_id: "", // get it by registering a twitch app https://dev.twitch.tv/dashboard/apps/create (Redirect URI is not used)
  client_secret: "", // secret of your registered twitch app
  streamlabs_socket_token: "", // get yours here https://streamlabs.com/dashboard#/apisettings in API TOKENS then "your socket API token"
  port: 3100, // the lib will listen to this port
  callback_url: "", // url to your server, accessible from the outside world
  secret: "", // any random string
  is_test: false // set to true to listen to test donations and hosts from streamlabs
});
```

### What if I don't have streamlabs?

Just don't put the `streamlabs_secret_token` option then, sadly you won't catch the "host" event, I found no satisfactory way to catch it without Streamlabs.

## Events

```javascript
channel.on("debug", msg => console.log(msg));
channel.on("info", msg => console.log(msg));
channel.on("error", err => console.error(err));

channel.on("chat", ({ viewerId, viewerName, message }) => {});
channel.on("cheer", ({ viewerId, viewerName, amount, message }) => {});
// for subs/resubs/subgifts, plan === "1000", "2000", "3000" or "Prime". See msg-param-sub-plan here https://dev.twitch.tv/docs/irc/tags/#usernotice-twitch-tags
channel.on("sub", ({ viewerId, viewerName, message, plan }) => {});
channel.on("resub", ({ viewerId, viewerName, message, months, plan }) => {});
channel.on(
  "subgift",
  ({ viewerId, viewerName, recipientId, recipientName, plan }) => {}
);
// you need to provide the streamlabs_socket_token option to catch "host" events
channel.on("host", ({ viewerId, viewerName, viewers }) => {});
channel.on("raid", ({ viewerId, viewerName, viewers }) => {});
channel.on("follow", ({ viewerId, viewerName }) => {});
// you need to make the bot moderator of the channel to catch "ban" events
channel.on("ban", ({ viewerId, viewerName }) => {});
channel.on("stream-begin", ({ game }) => {});
channel.on("stream-change-game", ({ game }) => {});
channel.on("stream-end", () => {});
channel.on(
  "streamlabs/donation",
  // viewerId provided when found from the donator name
  ({ viewerId, viewerName, amount, currency, message }) => {}
);
```

TwichChannel is an `EventEmitter`, you can use all of its methods too.

You **should** set a listener for `error` otherwise it will throw on errors: https://nodejs.org/api/events.html#events_error_events

## Methods

```javascript
await channel.connect();

await channel.disconnect();

// send a message in chat from the bot account
channel.say("i'm a bot");

// get the twitch user who made the most viewed clip of the week
const { viewerId, viewerName } = await getTopClipper();
```
