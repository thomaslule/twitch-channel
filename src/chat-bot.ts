import { Client } from "tmi.js";
import { Config } from "./config";
import { getTwitchUserByName } from "./get-twitch-user-by-name";
import { log } from "./log";
import { TwitchChannel } from "./twitch-channel";

export class ChatBot {
  private activated: boolean;
  private config!: ChatBotConfig;
  private bot!: Client;

  constructor(private twitchChannel: TwitchChannel, config: Config) {
    this.activated =
      config.bot_name !== undefined && config.bot_token !== undefined;
    if (this.activated) {
      this.config = config as ChatBotConfig;
      this.bot = Client({
        options: { debug: false },
        connection: { reconnect: true },
        identity: {
          username: this.config.bot_name,
          password: this.config.bot_token,
        },
        channels: [this.config.channel],
      });

      this.bot.on("chat", (channel, userstate, message, self) => {
        try {
          if (self) {
            return;
          }
          const viewerId = userstate["user-id"];
          const viewerName = userstate["display-name"];
          twitchChannel.emit("chat", { viewerId, viewerName, message });
        } catch (error) {
          log.error(
            this.twitchChannel,
            "an error happened during a chat event",
            error
          );
        }
      });

      this.bot.on("cheer", (channel, userstate, message) => {
        try {
          const viewerId = userstate["user-id"];
          const viewerName = userstate["display-name"];
          const amount = parseInt(userstate.bits!, 10);
          if (isNaN(amount)) {
            throw new Error(`cheer amount was not a number: ${userstate.bits}`);
          }
          twitchChannel.emit("cheer", {
            viewerId,
            viewerName,
            amount,
            message,
          });
        } catch (error) {
          log.error(
            this.twitchChannel,
            "an error happened during a cheer event",
            error
          );
        }
      });

      this.bot.on("subscription", async (channel, username, method, msg) => {
        try {
          const viewer = await getTwitchUserByName(this.config, username);
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
        } catch (error) {
          log.error(
            this.twitchChannel,
            "an error happened during a subscription event",
            error
          );
        }
      });

      this.bot.on(
        "resub",
        async (channel, username, monthsDeprecated, msg, userstate, method) => {
          try {
            const viewer = await getTwitchUserByName(this.config, username);
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
          } catch (error) {
            log.error(
              this.twitchChannel,
              "an error happened during a resub event",
              error
            );
          }
        }
      );

      this.bot.on(
        "subgift",
        async (channel, username, monthsDeprecated, recipient, method) => {
          try {
            const viewer = await getTwitchUserByName(this.config, username);
            if (!viewer) {
              throw new Error(
                `subgift: couldnt get the twitch viewer named ${username}`
              );
            }
            const viewerId = viewer.id;
            const viewerName = viewer.displayName;
            const recipientUser = await getTwitchUserByName(
              this.config,
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
          } catch (error) {
            log.error(
              this.twitchChannel,
              "an error happened during a subgift event",
              error
            );
          }
        }
      );

      this.bot.on("raided", async (channel, raider, viewersString: any) => {
        try {
          const viewer = await getTwitchUserByName(this.config, raider);
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
        } catch (error) {
          log.error(
            this.twitchChannel,
            "an error happened during a raided event",
            error
          );
        }
      });

      this.bot.on("ban", async (channel, username) => {
        try {
          const viewer = await getTwitchUserByName(this.config, username);
          if (!viewer) {
            throw new Error(
              `ban: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          twitchChannel.emit("ban", { viewerId, viewerName });
        } catch (error) {
          log.error(
            this.twitchChannel,
            "an error happened during a ban event",
            error
          );
        }
      });
    }
  }

  public async connect() {
    if (
      this.activated &&
      this.bot.readyState() !== "CONNECTING" &&
      this.bot.readyState() !== "OPEN"
    ) {
      await this.bot.connect();
      log.info(
        this.twitchChannel,
        "connected to the IRC chat with the bot account"
      );
    }
  }

  public async disconnect() {
    if (
      this.activated &&
      this.bot.readyState() !== "CLOSING" &&
      this.bot.readyState() !== "CLOSED"
    ) {
      await this.bot.disconnect();
    }
  }
}

interface ChatBotConfig extends Config {
  bot_name: string;
  bot_token: string;
}
