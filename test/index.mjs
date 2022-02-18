import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

import { TwitchChannel } from "../lib/index.js";
import config from "./config.js";

const channel = new TwitchChannel(config);

channel.on("log", (event) => {
  console.log("log", event);
});
channel.on("chat", (event) => {
  console.log("chat", event);
});
channel.on("clear-chat", (event) => {
  console.log("clear-chat", event);
});
channel.on("emote-only", (event) => {
  console.log("emote-only", event);
});
channel.on("followers-only", (event) => {
  console.log("followers-only", event);
});
channel.on("subs-only", (event) => {
  console.log("subs-only", event);
});
channel.on("slow-mode", (event) => {
  console.log("slow-mode", event);
});
channel.on("message-deleted", (event) => {
  console.log("message-deleted", event);
});
channel.on("cheer", (event) => {
  console.log("cheer", event);
});
channel.on("sub", (event) => {
  console.log("sub", event);
});
channel.on("resub", (event) => {
  console.log("resub", event);
});
channel.on("subgift", (event) => {
  console.log("subgift", event);
});
channel.on("hosting", (event) => {
  console.log("hosting", event);
});
channel.on("host", (event) => {
  console.log("host", event);
});
channel.on("raid", (event) => {
  console.log("raid", event);
});
channel.on("follow", (event) => {
  console.log("follow", event);
});
channel.on("stream-begin", (event) => {
  console.log("stream-begin", event);
});
channel.on("stream-change-game", (event) => {
  console.log("stream-change-game", event);
});
channel.on("stream-end", (event) => {
  console.log("stream-end", event);
});
channel.on("ban", (event) => {
  console.log("ban", event);
});
channel.on("timeout", (event) => {
  console.log("timeout", event);
});

await channel.connect();
await new Promise((resolve) => setTimeout(resolve, 3000));

const rl = readline.createInterface({ input, output });
await rl.question("Press enter to close\n");
rl.close();

await channel.disconnect();
