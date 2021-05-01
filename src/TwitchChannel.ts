import { EventEmitter } from "events";
import { ChatBot } from "./ChatBot";
import {
  Config,
  getWithDefault,
  MandatoryConfig,
  OptionalConfig,
} from "./Config";
import { log } from "./log";
import { Webhook } from "./Webhook";

export class TwitchChannel extends EventEmitter {
  private config: Config;
  private webhook: Webhook;
  private chatBot: ChatBot;

  constructor(opts: MandatoryConfig & Partial<OptionalConfig>) {
    super();
    this.on("error", (error) => {
      log.error(this, "an uncaught error happened in a listener", error);
    });
    this.config = getWithDefault(opts);
    this.webhook = new Webhook(this, this.config);
    this.chatBot = new ChatBot(this, this.config);
  }

  public on(
    event: "log",
    handler: (param: {
      level: "error" | "warn" | "info" | "debug";
      message: string;
      error: unknown;
    }) => void
  ): this;
  public on(
    event: "chat",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message: string;
    }) => void
  ): this;
  public on(
    event: "cheer",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      amount: number;
      message: string;
    }) => void
  ): this;
  public on(
    event: "sub",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message?: string;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "resub",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message?: string;
      months?: number;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "subgift",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      recipientId: string;
      recipientName: string;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "host",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      viewers: number;
      autohost: boolean;
    }) => void
  ): this;
  public on(
    event: "raid",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      viewers: number;
    }) => void
  ): this;
  public on(
    event: "ban",
    handler: (param: { viewerId: string; viewerName: string }) => void
  ): this;
  public on(
    event: "follow",
    handler: (param: { viewerId: string; viewerName: string }) => void
  ): this;
  public on(
    event: "stream-begin",
    handler: (param: { game: string }) => void
  ): this;
  public on(
    event: "stream-change-game",
    handler: (param: { game: string }) => void
  ): this;
  public on(event: "stream-end", handler: (param: {}) => void): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }

  public async connect() {
    await Promise.all([this.chatBot.connect(), this.webhook.start()]);
  }

  public async disconnect() {
    await Promise.all([this.chatBot.disconnect(), this.webhook.stop()]);
  }
}
