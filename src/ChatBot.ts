import { ApiClient } from "@twurple/api";
import { Client } from "tmi.js";

import { Config } from "./Config";
import { getTwitchUserByName } from "./getTwitchUserByName";
import { log } from "./log";
import { TwitchChannel } from "./TwitchChannel";

export class ChatBot {
  private config!: ChatBotConfig;
  private anonymous: boolean;
  private bot!: Client;

  constructor(
    private twitchChannel: TwitchChannel,
    config: Config,
    apiClient: ApiClient
  ) {
    this.config = config as ChatBotConfig;
    this.anonymous = !this.config.bot_name || !this.config.bot_token;
    this.bot = Client({
      connection: {
        secure: true,
        reconnect: true,
      },
      identity: this.anonymous
        ? undefined
        : {
            username: this.config.bot_name,
            password: this.config.bot_token,
          },
      channels: [this.config.channel],
      logger: {
        info: (message) => {
          log.debug(twitchChannel, `IRC bot: ${message}`);
        },
        warn: (message) => {
          log.warn(twitchChannel, `IRC bot: ${message}`);
        },
        error: (message) => {
          log.error(twitchChannel, `IRC bot: ${message}`);
        },
      },
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
        const viewer = await getTwitchUserByName(username, apiClient);
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
          const viewer = await getTwitchUserByName(username, apiClient);
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
          const viewer = await getTwitchUserByName(username, apiClient);
          if (!viewer) {
            throw new Error(
              `subgift: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          const recipientUser = await getTwitchUserByName(recipient, apiClient);
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
        const viewer = await getTwitchUserByName(raider, apiClient);
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
        const viewer = await getTwitchUserByName(username, apiClient);
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

    this.bot.on("hosted", async (channel, username, viewers, autohost) => {
      try {
        const viewer = await getTwitchUserByName(username, apiClient);
        if (!viewer) {
          throw new Error(
            `host: couldnt get the twitch viewer named ${username}`
          );
        }
        const viewerId = viewer.id;
        const viewerName = viewer.displayName;
        twitchChannel.emit("host", {
          viewerId,
          viewerName,
          viewers,
          autohost,
        });
      } catch (error) {
        log.error(
          twitchChannel,
          "an error happened during a host event",
          error
        );
      }
    });
  }

  public async connect() {
    if (
      this.bot.readyState() !== "CONNECTING" &&
      this.bot.readyState() !== "OPEN"
    ) {
      await this.bot.connect();
      log.info(
        this.twitchChannel,
        this.anonymous
          ? "connected to the IRC chat as anonymous"
          : "connected to the IRC chat with the bot account"
      );
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
}

interface ChatBotConfig extends Config {
  bot_name: string;
  bot_token: string;
}
