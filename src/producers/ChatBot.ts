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
    log.info(this.emitter, "connected to the IRC chat");
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
                `ban: couldnt get the twitch viewer with id ${userstate["target-user-id"]}`
              );
            }
            const viewerId = viewer.id;
            const viewerName = viewer.displayName;
            this.emitter.emit({ type, viewerId, viewerName });
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
          const viewerId = userstate["user-id"]!;
          const viewerName = userstate["display-name"]!;
          this.emitter.emit({ type, viewerId, viewerName, message });
        });
      });
      return true;
    } else if (type === "cheer") {
      this.bot.on("cheer", (channel, userstate, message) => {
        this.logErrors("cheer", () => {
          const viewerId = userstate["user-id"]!;
          const viewerName = userstate["display-name"]!;
          const amount = parseInt(userstate.bits!, 10);
          if (isNaN(amount)) {
            throw new Error(`cheer amount was not a number: ${userstate.bits}`);
          }
          this.emitter.emit({
            type,
            viewerId,
            viewerName,
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
      this.bot.on("emoteonly", () => {
        this.logErrors("emoteonly", () => {
          this.emitter.emit({ type });
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
            throw new Error(
              `host: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          this.emitter.emit({
            type,
            viewerId,
            viewerName,
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
            throw new Error(
              `host: couldnt get the twitch viewer named ${username}`
            );
          }
          const targetId = target.id;
          const targetName = target.displayName;
          this.emitter.emit({
            type,
            targetId,
            targetName,
            viewers,
          });
        });
      });
      return true;
    } else if (type === "message-deleted") {
      this.bot.on("messagedeleted", (channel, username, deletedMessage) => {
        this.logErrors("messagedeleted", async () => {
          const viewer = await this.apiClient.users.getUserByName(username);
          if (!viewer) {
            throw new Error(
              `host: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          this.emitter.emit({
            type,
            viewerId,
            viewerName,
            deletedMessage,
          });
        });
      });
      return true;
    } else if (type === "raid") {
      this.bot.on("raided", (channel, raider, viewersString: any) => {
        this.logErrors("raided", async () => {
          const viewer = await this.apiClient.users.getUserByName(raider);
          if (!viewer) {
            throw new Error(
              `raid: couldnt get the twitch viewer named ${raider}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          // viewers arg is typed as number by the lib but it comes as a string
          const viewers = Number.parseInt(viewersString, 10);
          this.emitter.emit({
            type,
            viewerId,
            viewerName,
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
      this.bot.on("subscription", (channel, username, method, msg) => {
        this.logErrors("subscription", async () => {
          const viewer = await this.apiClient.users.getUserByName(username);
          if (!viewer) {
            throw new Error(
              `subscription: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          const message = msg ?? "";
          const { plan } = method;
          const tier = !plan || plan === "Prime" ? "1000" : plan;
          this.emitter.emit({
            type,
            viewerId,
            viewerName,
            message,
            months: 1,
            tier,
          });
        });
      });
      this.bot.on(
        "resub",
        (channel, username, monthsDeprecated, msg, userstate, method) => {
          this.logErrors("resub", async () => {
            const viewer = await this.apiClient.users.getUserByName(username);
            if (!viewer) {
              throw new Error(
                `resub: couldnt get the twitch viewer named ${username}`
              );
            }
            const viewerId = viewer.id;
            const viewerName = viewer.displayName;
            const message = msg ?? "";
            const { plan } = method;
            const tier = !plan || plan === "Prime" ? "1000" : plan;
            const months = Number.parseInt(
              userstate["msg-param-cumulative-months"] as string,
              10
            );
            this.emitter.emit({
              type,
              viewerId,
              viewerName,
              message,
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
                `subgift: couldnt get the twitch viewer named ${recipient}`
              );
            }
            const viewerId = viewer.id;
            const viewerName = viewer.displayName;
            const gifter = await this.apiClient.users.getUserByName(username);
            if (!gifter) {
              throw new Error(
                `subgift: couldnt get the twitch viewer named ${username}`
              );
            }
            const gifterId = gifter.id;
            const gifterName = gifter.displayName;
            const { plan } = method;
            const tier = !plan || plan === "Prime" ? "1000" : plan;
            this.emitter.emit({
              type,
              viewerId,
              viewerName,
              gifterId,
              gifterName,
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
                `subscription: couldnt get the twitch viewer named ${username}`
              );
            }
            const viewerId = viewer.id;
            const viewerName = viewer.displayName;
            this.emitter.emit({
              type,
              viewerId,
              viewerName,
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
        `an error happened during an IRC ${tmiEvent} event`,
        error
      );
    }
  }
}

interface ChatBotConfig extends Config {
  bot_name: string;
  bot_token: string;
}
