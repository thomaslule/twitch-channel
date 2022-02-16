# twitch-channel <!-- omit in toc -->

A small library to listen to various events that can happen on a twitch channel (chat messages, hosts, donations, raids, subscriptions…)

This library acts as a layer on top of various twitch APIs (currently: IRC and Webhooks) so you only have to interact with a single EventEmitter that emits uniform events.

The event objects are kept simple and without surprises. Every viewer-related event will have the twitch id and the current display name in `viewerId` and `viewerName` fields.

- [Example](#example)
- [Config options](#config-options)
  - [Mandatory config](#mandatory-config)
  - [IRC config](#irc-config)
  - [Webhook config](#webhook-config)
- [Events](#events)
  - [`log`](#log)
  - [`chat`](#chat)
  - [`cheer`](#cheer)
  - [`sub`](#sub)
  - [`resub`](#resub)
  - [`subgift`](#subgift)
  - [`host`](#host)
  - [`raid`](#raid)
  - [`ban`](#ban)
  - [`follow`](#follow)
  - [`stream-begin`](#stream-begin)
  - [`stream-change-game`](#stream-change-game)
  - [`stream-end`](#stream-end)
- [Methods](#methods)
- [Upgrade from v0 to v1](#upgrade-from-v0-to-v1)

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
channel.on("log", ({ level, message, error }) => {
  if (level === "error") {
    console.error(`${level}: ${message}`, error);
  } else {
    console.log(`${level}: ${message}`);
  }
});

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

- ban (emitted only if the bot is a moderator)
- host (emitted only if the bot is the broadcaster)

| Config name | Type   | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| bot_name    | string | twitch bot login                                   |
| bot_token   | string | create your token here https://twitchapps.com/tmi/ |

### Webhook config

Optional config used for events:

- follow
- stream-begin
- stream-change-game
- stream-end

| Config name  | Type   | Description                                                                                                             |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| callback_url | string | url to your server, accessible from the internet                                                                        |
| port         | string | if provided, the lib will listen to this port for webhook requests (otherwise you can use the `getMiddleware()` method) |

## Events

### `log`

```typescript
{
  level: "error" | "warn" | "info" | "debug";
  message: string;
  error: unknown;
}
```

### `chat`

```typescript
{
  viewerId: string;
  viewerName: string;
  message: string;
}
```

### `clear-chat`

```typescript
{
}
```

### `emote-only`

```typescript
{
}
```

### `followers-only`

```typescript
{
  enabled: boolean;
  followAge: number; // in minutes
}
```

### `subs-only`

```typescript
{
  enabled: boolean;
}
```

### `slow-mode`

```typescript
{
  enabled: boolean;
  interval: number; // in seconds
}
```

### `cheer`

```typescript
{
  viewerId: string;
  viewerName: string;
  amount: number;
  message: string;
}
```

### `sub`

```typescript
{
  viewerId: string;
  viewerName: string;
  message?: string;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}
```

### `resub`

```typescript
{
  viewerId: string;
  viewerName: string;
  message?: string;
  months?: number;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}
```

### `subgift`

```typescript
{
  viewerId: string;
  viewerName: string;
  recipientId: string;
  recipientName: string;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}
```

### `host`

Emitted only if the broadcaster account was connected with the [IRC config](#irc-config).

```typescript
{
  viewerId: string;
  viewerName: string;
  viewers: number;
  autohost: boolean;
}
```

### `hosting`

```typescript
{
  targetId: string;
  targetName: string;
  viewers: number;
}
```

### `message-deleted`

```typescript
{
  viewerId: string;
  viewerName: string;
  deletedMessage: string;
}
```

### `raid`

```typescript
{
  viewerId: string;
  viewerName: string;
  viewers: number;
}
```

### `ban`

Emitted only if a moderator account was connected with the [IRC config](#irc-config).

```typescript
{
  viewerId: string;
  viewerName: string;
}
```

### `timeout`

Emitted only if a moderator account was connected with the [IRC config](#irc-config).

```typescript
{
  viewerId: string;
  viewerName: string;
  duration: number; // in seconds
}
```

### `follow`

Emitted only if a [webhook config](#webhook-config) was provided.

```typescript
{
  viewerId: string;
  viewerName: string;
}
```

### `stream-begin`

Emitted only if a [webhook config](#webhook-config) was provided.

```typescript
{
  game: string;
}
```

### `stream-change-game`

Emitted only if a [webhook config](#webhook-config) was provided.

```typescript
{
  game: string;
}
```

### `stream-end`

Emitted only if a [webhook config](#webhook-config) was provided.

```typescript
{
}
```

## Methods

```javascript
await channel.connect();

channel.getMiddleware();

await channel.disconnect();
```

TwichChannel is an [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter), you can use all of its methods too.

## Upgrade from v0 to v1

- we dont use streamlabs anymore, the `streamlabs/donation` event wont fire and the `streamlabs_socket_token` and `is_test` properties have been removed
- to catch the `host` event, you must now setup the broadcaster as the IRC bot
- the `host` event is now also fired with auto-hosts, it has a new `autohost` boolean property
- the `say` and `getTopClipper` functions have been removed
- the `error`, `info` and `debug` events are replaced by a `log` event (which has a new `warn` level)
