import * as TwitchJs from "twitch-js";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class ChatBot {
  private bot: any;

  constructor(twitchChannel: TwitchChannel, private options: Options) {
    this.bot = new TwitchJs.client({
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
      const amount = userstate.bits;
      twitchChannel.emit("cheer", { viewerId, viewerName, amount, message });
    });

    this.bot.on("subscription", async (channel: string, username: string, method: any, message: string) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`subscription: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        twitchChannel.emit("sub", { viewerId, viewerName, message });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("resub", async (channel: string, username: string, months: number, message: string) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`resub: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        twitchChannel.emit("resub", { viewerId, viewerName, message, months });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("subgift", async (channel: string, username: string, recipient: string) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) { throw new Error(`subgift: couldnt get the twitch viewer named ${username}`); }
        const viewerId = viewer.id;
        const viewerName = viewer.display_name;
        const recipientUser = await twitchChannel.getTwitchUserByName(recipient);
        if (!viewer) { throw new Error(`subgift: couldnt get the twitch viewer named ${username}`); }
        const recipientId = recipientUser.id;
        twitchChannel.emit("subgift", { viewerId, viewerName, recipientId });
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
