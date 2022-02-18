import { ApiClient } from "@twurple/api";
import { ClientCredentialsAuthProvider } from "@twurple/auth";
import { EventEmitter } from "events";

import { ChatBot } from "./ChatBot";
import { Config } from "./Config";
import { EventSub } from "./EventSub";
import { log } from "./log";

export class TwitchChannel {
  private emitter = new EventEmitter();
  private eventSub?: EventSub;
  private chatBot: ChatBot;

  constructor(private config: Config) {
    this.on("error", (error) => {
      log.error(
        this.emitter,
        "an uncaught error happened in a listener",
        error
      );
    });

    const authProvider = new ClientCredentialsAuthProvider(
      this.config.client_id,
      this.config.client_secret
    );
    const apiClient = new ApiClient({ authProvider });
    if (EventSub.hasRequiredConfig(this.config)) {
      this.eventSub = new EventSub(this.emitter, this.config, apiClient);
    }
    this.chatBot = new ChatBot(this.emitter, this.config, apiClient);
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
    event: "clear-chat",
    handler: (param: Record<string, never>) => void
  ): this;
  public on(
    event: "emote-only",
    handler: (param: Record<string, never>) => void
  ): this;
  public on(
    event: "followers-only",
    handler: (param: { enabled: boolean; followAge: number }) => void
  ): this;
  public on(
    event: "subs-only",
    handler: (param: { enabled: boolean }) => void
  ): this;
  public on(
    event: "slow-mode",
    handler: (param: { enabled: boolean; interval: number }) => void
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
    event: "hosting",
    handler: (param: {
      targetId: string;
      targetName: string;
      viewers: number;
    }) => void
  ): this;
  public on(
    event: "message-deleted",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      deletedMessage: string;
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
    event: "timeout",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      duration: number;
    }) => void
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
  public on(
    event: "stream-end",
    handler: (param: Record<string, never>) => void
  ): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this {
    this.emitter.on(event, handler);
    return this;
  }

  public async connect() {
    await Promise.all([this.chatBot.connect(), this.eventSub?.start()]);
  }

  public async disconnect() {
    await Promise.all([this.chatBot.disconnect(), this.eventSub?.stop()]);
  }
}
