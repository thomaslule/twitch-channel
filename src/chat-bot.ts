import { Client } from "twitch-js";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class ChatBot {
  private bot: Client;

  constructor(twitchChannel: TwitchChannel, private options: Options) {
    this.bot = new Client({
      options: { debug: false },
      connection: { reconnect: true },
      identity: {
        username: this.options.bot_name,
        password: this.options.bot_token,
      },
      channels: [`#${this.options.channel}`],
    });

    this.bot.on("chat", (channel: string, userstate: any, message: string, self: boolean) => {
      if (self) { return; }
      const viewerId = userstate["user-id"];
      const viewerName = userstate["display-name"];
      twitchChannel.emit("chat", { viewerId, viewerName, message });
    });

    this.bot.on("cheer", (channel: string, userstate: any, message: string) => {
      const viewerId = userstate["user-id"];
      const viewerName = userstate["display-name"];
      const amount = parseInt(userstate.bits, 10);
      if (isNaN(amount)) {
        twitchChannel.emit("error", `cheer amount was not a number: ${userstate.bits}`);
        return;
      }
      twitchChannel.emit("cheer", { viewerId, viewerName, amount, message });
    });

    this.bot.on(
      "subscription",
      async (channel: string, username: string, method: any, msg: string,
    ) => {
      try {
        twitchChannel.emit("debug", `subscription method: ${JSON.stringify(method)}`);
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`subscription: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        const message = msg ? msg : undefined;
        const plan = method.plan;
        twitchChannel.emit("sub", { viewerId, viewerName, message, plan });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("resub", async (channel: string, username: string, months: number, msg: string, userstate, method) => {
      try {
        twitchChannel.emit("debug", `resub method: ${JSON.stringify(method)}`);
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`resub: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        const message = msg ? msg : undefined;
        const plan = method.plan;
        twitchChannel.emit("resub", { viewerId, viewerName, message, months, plan });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("subgift", async (channel: string, username: string, recipient: string, method) => {
      try {
        twitchChannel.emit("debug", `subgift method: ${JSON.stringify(method)}`);
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`subgift: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        const recipientUser = await twitchChannel.getTwitchUserByName(recipient);
        if (!recipientUser) { throw new Error(`subgift: couldnt get the twitch viewer named ${username}`); }
        const recipientId = recipientUser.id;
        const plan = method.plan;
        twitchChannel.emit("subgift", { viewerId, viewerName, recipientId, plan });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("raid", async ({ raider, viewers }: any) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(raider);
        if (!viewer) { throw new Error(`raid: couldnt get the twitch viewer named ${raider}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        twitchChannel.emit("raid", { viewerId, viewerName, viewers });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

  }

  public async connect() {
    if (this.bot.readyState() !== "CONNECTING" && this.bot.readyState() !== "OPEN") {
      await this.bot.connect();
    }
  }

  public async disconnect() {
    if (this.bot.readyState() !== "CLOSING" && this.bot.readyState() !== "CLOSED") {
      await this.bot.disconnect();
    }
  }

  public say(message: string) {
    this.bot.say(`#${this.options.channel}`, message);
  }
}
