import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

import { TwitchChannel } from "../lib/index.js";
import config from "./config.js";

const channel = new TwitchChannel(config);

channel.on("log", (event) => {
  console.log(`[${event.level}] ${event.message}`, event.error);
});
channel.on("ban", console.log);
channel.on("chat", console.log);
channel.on("cheer", console.log);
channel.on("clear-chat", console.log);
channel.on("emotes-only", console.log);
channel.on("follow", console.log);
channel.on("followers-only", console.log);
channel.on("host", console.log);
channel.on("hosting", console.log);
channel.on("message-deleted", console.log);
channel.on("raid", console.log);
channel.on("reward-redeem", console.log);
channel.on("slow-mode", console.log);
channel.on("stream-begin", console.log);
channel.on("stream-change-category", console.log);
channel.on("stream-change-title", console.log);
channel.on("stream-end", console.log);
channel.on("sub", console.log);
channel.on("sub-gift", console.log);
channel.on("sub-gift-received", console.log);
channel.on("subs-only", console.log);
channel.on("timeout", console.log);

await channel.connect();
await new Promise((resolve) => setTimeout(resolve, 3000));

const rl = readline.createInterface({ input, output });
await rl.question("Press enter to close\n");
rl.close();

await channel.disconnect();
