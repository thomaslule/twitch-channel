import { ApiClient } from "@twurple/api";
import { Client } from "tmi.js";

import { Config } from "../Config";
import { EventType } from "../Events.types";
import { log } from "../log";
import { TwitchEventEmitter } from "../TwitchChannel";
import { Producer } from "./Producer.types";

export class ChatBot implements Producer {
  public name = "IRC";
  private config!: ChatBotConfig;
  private bot!: Client;
  private isLoggedIn = false;
  private isBroadcaster = false;
  private isMod = false;

  constructor(
    private emitter: TwitchEventEmitter,
    config: Config,
    private apiClient: ApiClient
  ) {
    this.config = config as ChatBotConfig;
    this.isLoggedIn = !!this.config.bot_name && !!this.config.bot_token;
    this.isBroadcaster = this.config.bot_name === this.config.channel;
    this.bot = Client({
      connection: {
        secure: true,
        reconnect: true,
      },
      identity: this.isLoggedIn
        ? {
            username: this.config.bot_name,
            password: this.config.bot_token,
          }
        : undefined,
      channels: [this.config.channel],
      logger: {
        info: (message) => {
          log.debug(emitter, `IRC bot: ${message}`);
        },
        warn: (message) => {
          log.warn(emitter, `IRC bot: ${message}`);
        },
        error: (message) => {
          log.error(emitter, `IRC bot: ${message}`);
        },
      },
    });
  }

  public async connect() {
    await this.bot.connect();
    if (this.isLoggedIn) {
      const mods = await this.bot.mods(this.config.channel);
      this.isMod = this.isBroadcaster || mods.includes(this.config.bot_name);
    }
    log.info(this.emitter, "Connected to the IRC chat");
  }

  public async disconnect() {
    await this.bot.disconnect();
    this.bot.removeAllListeners();
  }

  public async produceEvents(type: EventType): Promise<boolean> {
    if (type === "ban" && this.isMod) {
      interface BanUserState {
        "target-user-id": string;
      }
      // ts-ignore is here because typing doesnt know about the last arg
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.bot.on(
        "ban",
        (channel, username, reason, userstate: BanUserState) => {
          this.logErrors("ban", async () => {
            const viewer = await this.apiClient.users.getUserById(
              userstate["target-user-id"]
            );
            if (!viewer) {
              throw new Error(
                `Couldnt get the twitch viewer with id ${userstate["target-user-id"]}`
              );
            }
            this.emitter.emit({
              type,
              viewerId: viewer.id,
              viewerName: viewer.displayName,
            });
          });
        }
      );
      return true;
    } else if (type === "chat") {
      this.bot.on("chat", (channel, userstate, message, self) => {
        this.logErrors("chat", () => {
          if (self) {
            return;
          }
          this.emitter.emit({
            type,
            viewerId: userstate["user-id"]!,
            viewerName: userstate["display-name"]!,
            message,
          });
        });
      });
      return true;
    } else if (type === "cheer") {
      this.bot.on("cheer", (channel, userstate, message) => {
        this.logErrors("cheer", () => {
          const amount = parseInt(userstate.bits!, 10);
          if (isNaN(amount)) {
            throw new Error(`cheer amount was not a number: ${userstate.bits}`);
          }
          this.emitter.emit({
            type,
            viewerId: userstate["user-id"]!,
            viewerName: userstate["display-name"]!,
            amount,
            message,
          });
        });
      });
      return true;
    } else if (type === "clear-chat") {
      this.bot.on("clearchat", () => {
        this.logErrors("clearchat", () => {
          this.emitter.emit({ type });
        });
      });
      return true;
    } else if (type === "emotes-only") {
      this.bot.on("emoteonly", (channel, enabled) => {
        this.logErrors("emoteonly", () => {
          this.emitter.emit({ type, enabled });
        });
      });
      return true;
    } else if (type === "followers-only") {
      this.bot.on("followersonly", async (channel, enabled, followAge) => {
        this.logErrors("followersonly", () => {
          this.emitter.emit({
            type,
            enabled,
            followAge,
          });
        });
      });
      return true;
    } else if (type === "host" && this.isBroadcaster) {
      this.bot.on("hosted", (channel, username, viewers, autohost) => {
        this.logErrors("hosted", async () => {
          const viewer = await this.apiClient.users.getUserByName(username);
          if (!viewer) {
            throw new Error(`Couldnt get the twitch viewer named ${username}`);
          }
          this.emitter.emit({
            type,
            viewerId: viewer.id,
            viewerName: viewer.displayName,
            viewers,
            autohost,
          });
        });
      });
      return true;
    } else if (type === "hosting") {
      this.bot.on("hosting", (channel, username, viewers) => {
        this.logErrors("hosting", async () => {
          const target = await this.apiClient.users.getUserByName(username);
          if (!target) {
            throw new Error(`Couldnt get the twitch viewer named ${username}`);
          }
          this.emitter.emit({
            type,
            targetId: target.id,
            targetName: target.displayName,
            viewers,
          });
        });
      });
      return true;
    } else if (type === "message-deleted") {
      this.bot.on("messagedeleted", (channel, username, message) => {
        this.logErrors("messagedeleted", async () => {
          const viewer = await this.apiClient.users.getUserByName(username);
          if (!viewer) {
            throw new Error(`Couldnt get the twitch viewer named ${username}`);
          }
          this.emitter.emit({
            type,
            viewerId: viewer.id,
            viewerName: viewer.displayName,
            message,
          });
        });
      });
      return true;
    } else if (type === "raid") {
      this.bot.on("raided", (channel, raider, viewersString: any) => {
        this.logErrors("raided", async () => {
          const viewer = await this.apiClient.users.getUserByName(raider);
          if (!viewer) {
            throw new Error(`Couldnt get the twitch viewer named ${raider}`);
          }
          // viewers arg is typed as number by the lib but it comes as a string
          const viewers = Number.parseInt(viewersString, 10);
          this.emitter.emit({
            type,
            viewerId: viewer.id,
            viewerName: viewer.displayName,
            viewers,
          });
        });
      });
      return true;
    } else if (type === "slow-mode") {
      this.bot.on("slowmode", (channel, enabled, interval) => {
        this.logErrors("slowmode", () => {
          this.emitter.emit({ type, enabled, interval });
        });
      });
      return true;
    } else if (type === "sub") {
      this.bot.on("subscription", (channel, username, method, message) => {
        this.logErrors("subscription", async () => {
          const viewer = await this.apiClient.users.getUserByName(username);
          if (!viewer) {
            throw new Error(`Couldnt get the twitch viewer named ${username}`);
          }
          const { plan } = method;
          const tier = !plan || plan === "Prime" ? "1000" : plan;
          this.emitter.emit({
            type,
            viewerId: viewer.id,
            viewerName: viewer.displayName,
            message: message ?? "",
            months: 1,
            tier,
          });
        });
      });
      this.bot.on(
        "resub",
        (channel, username, monthsDeprecated, message, userstate, method) => {
          this.logErrors("resub", async () => {
            const viewer = await this.apiClient.users.getUserByName(username);
            if (!viewer) {
              throw new Error(
                `Couldnt get the twitch viewer named ${username}`
              );
            }
            const months = Number.parseInt(
              userstate["msg-param-cumulative-months"] as string,
              10
            );
            const { plan } = method;
            const tier = !plan || plan === "Prime" ? "1000" : plan;
            this.emitter.emit({
              type,
              viewerId: viewer.id,
              viewerName: viewer.displayName,
              message: message ?? "",
              months,
              tier,
            });
          });
        }
      );
      return true;
    } else if (type === "sub-gift-received") {
      this.bot.on(
        "subgift",
        (channel, username, monthsDeprecated, recipient, method) => {
          this.logErrors("subgift", async () => {
            const viewer = await this.apiClient.users.getUserByName(recipient);
            if (!viewer) {
              throw new Error(
                `Couldnt get the twitch viewer named ${recipient}`
              );
            }
            const gifter = await this.apiClient.users.getUserByName(username);
            if (!gifter) {
              throw new Error(
                `Couldnt get the twitch viewer named ${username}`
              );
            }
            const { plan } = method;
            const tier = !plan || plan === "Prime" ? "1000" : plan;
            this.emitter.emit({
              type,
              recipientId: viewer.id,
              recipientName: viewer.displayName,
              gifterId: gifter.id,
              gifterName: gifter.displayName,
              tier,
            });
          });
        }
      );
      return true;
    } else if (type === "subs-only") {
      this.bot.on("subscribers", (channel, enabled) => {
        this.logErrors("subscribers", () => {
          this.emitter.emit({ type, enabled });
        });
      });
      return true;
    } else if (type === "timeout" && this.isMod) {
      this.bot.on(
        "timeout",
        (channel, username, reasonDeprecated, duration) => {
          this.logErrors("timeout", async () => {
            const viewer = await this.apiClient.users.getUserByName(username);
            if (!viewer) {
              throw new Error(
                `Couldnt get the twitch viewer named ${username}`
              );
            }
            this.emitter.emit({
              type,
              viewerId: viewer.id,
              viewerName: viewer.displayName,
              duration,
            });
          });
        }
      );
      return true;
    } else {
      return false;
    }
  }

  private async logErrors(
    tmiEvent: string,
    handler: () => void | Promise<void>
  ) {
    try {
      await handler();
    } catch (error) {
      log.error(
        this.emitter,
        `An error happened during an IRC ${tmiEvent} event`,
        error
      );
    }
  }
}

interface ChatBotConfig extends Config {
  bot_name: string;
  bot_token: string;
}
