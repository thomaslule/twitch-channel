import express from "express";
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";

import { TwitchChannel } from "../lib/index.js";
import config from "./config.js";

const channel = new TwitchChannel({ ...config, port: undefined });

channel.on("log", (event) => {
  if (event.level !== "debug") console.log(event);
});
channel.on("follow", console.log);

const app = express();
await channel.applyEventSubMiddleware(app);
const server = await new Promise((resolve) => {
  const server = app.listen(80, () => {
    resolve(server);
  });
});

await channel.connect();
await new Promise((resolve) => setTimeout(resolve, 3000));

const rl = readline.createInterface({ input: stdin, output: stdout });
await rl.question("Press enter to close\n");
rl.close();

await channel.disconnect();
await new Promise((resolve) => server.close(() => resolve()));
