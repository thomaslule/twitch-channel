# twitch-channel

A small library to listen to various events that can happen on a twitch channel (chat messages, hosts, donations, raids, subscriptions…)

You just have to provide the config options, this library connects to the chat, subscribes to webhooks, listen to streamlabs socket, it provides a nice abstraction layer for the various twitch APIs.

## Initialization

```javascript
const { TwitchChannel } = require('twitch-channel');

const channel = new TwitchChannel({
  channel: 'your_channel',
  bot_name: '', // twitch bot login
  bot_token: '', // create your token here https://twitchapps.com/tmi/
  client_id: '', // get it by registering a twitch app https://dev.twitch.tv/dashboard/apps/create (Redirect URI is not used)
  client_secret: '', // secret of your registered twitch app
  streamlabs_socket_token: '', // get yours here https://streamlabs.com/dashboard#/apisettings in API TOKENS then "your socket API token"
  port: 3100, // the lib will listen to this port
  callback_url: '', // url to your server, accessible from the outside world
  secret: '', // any random string
  is_test: false, // set to true to listen to test donations and hosts from streamlabs
});
```

## Events

```javascript
channel.on('info', msg => console.log(msg));
channel.on('error', err => console.error(err));

channel.on('chat', ({ viewerId, viewerName, message }) => {});
channel.on('cheer', ({ viewerId, viewerName, amount, message }) => {});
channel.on('sub', ({ viewerId, viewerName, amount, message }) => {});
channel.on('resub', ({ viewerId, viewerName, amount, message, months }) => {});
channel.on('subgift', ({ viewerId, viewerName, recipientId }) => {});
channel.on('host', ({ viewerId, viewerName, viewers }) => {});
channel.on('raid', ({ viewerId, viewerName, viewers }) => {});
channel.on('follow', ({ viewerId, viewerName }) => {});
channel.on('stream-begin', ({ game }) => {});
channel.on('stream-change-game', ({ game }) => {});
channel.on('stream-end', () => {});
channel.on('streamlabs/donation', ({ viewerId, viewerName, amount, currency, message }) => {});
```

## Methods

```javascript
await channel.connect();

await channel.disconnect();

// send a message in chat from the bot account
channel.say("i'm a bot");

// get the twitch user who made the most viewed clip of the week
const topClipper = await getTopClipper();
```

TwichChannel is an `EventEmitter`, you can use all of its methods too.
