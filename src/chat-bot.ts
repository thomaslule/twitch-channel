import { Client } from "tmi.js";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class ChatBot {
  private bot: Client;

  constructor(twitchChannel: TwitchChannel, private options: Options) {
    this.bot = Client({
      options: { debug: false },
      connection: { reconnect: true },
      identity: {
        username: this.options.bot_name,
        password: this.options.bot_token,
      },
      channels: [this.options.channel],
    });

    this.bot.on("chat", (channel, userstate, message, self) => {
      if (self) {
        return;
      }
      const viewerId = userstate["user-id"];
      const viewerName = userstate["display-name"];
      twitchChannel.emit("chat", { viewerId, viewerName, message });
    });

    this.bot.on("cheer", (channel, userstate, message) => {
      const viewerId = userstate["user-id"];
      const viewerName = userstate["display-name"];
      const amount = parseInt(userstate.bits!, 10);
      if (isNaN(amount)) {
        twitchChannel.emit(
          "error",
          `cheer amount was not a number: ${userstate.bits}`
        );
        return;
      }
      twitchChannel.emit("cheer", { viewerId, viewerName, amount, message });
    });

    this.bot.on("subscription", async (channel, username, method, msg) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) {
          throw new Error(
            `subscription: couldnt get the twitch viewer named ${username}`
          );
        }
        const viewerId = viewer.id;
        const viewerName = viewer.displayName;
        const message = msg ? msg : undefined;
        const { plan, planName } = method;
        twitchChannel.emit("sub", {
          viewerId,
          viewerName,
          message,
          plan,
          planName,
        });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on(
      "resub",
      async (channel, username, monthsDeprecated, msg, userstate, method) => {
        try {
          const viewer = await twitchChannel.getTwitchUserByName(username);
          if (!viewer) {
            throw new Error(
              `resub: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          const message = msg ? msg : undefined;
          const { plan, planName } = method;
          const months = Number.parseInt(
            userstate["msg-param-cumulative-months"] as string,
            10
          );
          twitchChannel.emit("resub", {
            viewerId,
            viewerName,
            message,
            months: Number.isNaN(months) ? undefined : months,
            plan,
            planName,
          });
        } catch (err) {
          twitchChannel.emit("error", err);
        }
      }
    );

    this.bot.on(
      "subgift",
      async (channel, username, monthsDeprecated, recipient, method) => {
        try {
          const viewer = await twitchChannel.getTwitchUserByName(username);
          if (!viewer) {
            throw new Error(
              `subgift: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          const recipientUser = await twitchChannel.getTwitchUserByName(
            recipient
          );
          if (!recipientUser) {
            throw new Error(
              `subgift: couldnt get the twitch viewer named ${username}`
            );
          }
          const recipientId = recipientUser.id;
          const recipientName = recipientUser.displayName;
          const { plan, planName } = method;
          twitchChannel.emit("subgift", {
            viewerId,
            viewerName,
            recipientId,
            recipientName,
            plan,
            planName,
          });
        } catch (err) {
          twitchChannel.emit("error", err);
        }
      }
    );

    this.bot.on("raided", async (channel, raider, viewersString: any) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(raider);
        if (!viewer) {
          throw new Error(
            `raid: couldnt get the twitch viewer named ${raider}`
          );
        }
        const viewerId = viewer.id;
        const viewerName = viewer.displayName;
        // viewers var is typed as number by the lib but it comes as a string
        const viewers = Number.parseInt(viewersString, 10);
        twitchChannel.emit("raid", {
          viewerId,
          viewerName,
          viewers,
        });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });

    this.bot.on("ban", async (channel, username) => {
      try {
        const viewer = await twitchChannel.getTwitchUserByName(username);
        if (!viewer) {
          throw new Error(
            `ban: couldnt get the twitch viewer named ${username}`
          );
        }
        const viewerId = viewer.id;
        const viewerName = viewer.displayName;
        twitchChannel.emit("ban", { viewerId, viewerName });
      } catch (err) {
        twitchChannel.emit("error", err);
      }
    });
  }

  public async connect() {
    if (
      this.bot.readyState() !== "CONNECTING" &&
      this.bot.readyState() !== "OPEN"
    ) {
      await this.bot.connect();
    }
  }

  public async disconnect() {
    if (
      this.bot.readyState() !== "CLOSING" &&
      this.bot.readyState() !== "CLOSED"
    ) {
      await this.bot.disconnect();
    }
  }

  public say(message: string) {
    this.bot.say(`#${this.options.channel}`, message);
  }
}
