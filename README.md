# twitch-channel

A small library to listen to various events that can happen on a twitch channel (chat messages, raids, follows, subscriptions…)

This library acts as a layer on top of various twitch APIs (currently: IRC and EventSub) so you only have to interact with a single EventEmitter that emits uniform events.

The event objects are kept simple and without surprises.

Full documentation: https://thomaslule.github.io/twitch-channel/classes/TwitchChannel.html

```javascript
import { TwitchChannel } from "twitch-channel";

const channel = new TwitchChannel({
  channel: "your_channel",
  clientId: "your_app_id",
  clientSecret: "your_app_secret",
});

channel.on("sub-gift-received", ({ gifterName, recipientName }) => {
  console.log(`${gifterName} just subgifted ${recipientName}`);
});
channel.on("log", ({ level, message, error }) => {
  console.log(`[${level}] ${message}`, error);
});

await channel.connect();
```
