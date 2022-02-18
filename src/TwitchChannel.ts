import { ApiClient } from "@twurple/api";
import { ClientCredentialsAuthProvider } from "@twurple/auth";
import { EventEmitter } from "events";

import { ChatBot } from "./ChatBot";
import { Config } from "./Config";
import {
  BanEvent,
  ChatEvent,
  CheerEvent,
  ClearChatEvent,
  EmotesOnlyEvent,
  FollowersOnlyEvent,
  FollowEvent,
  HostEvent,
  HostingEvent,
  LogEvent,
  MessageDeletedEvent,
  RaidEvent,
  ResubEvent,
  SlowModeEvent,
  StreamBeginEvent,
  StreamChangeGameEvent,
  StreamEndEvent,
  SubEvent,
  SubgiftEvent,
  SubsOnlyEvent,
  TimeoutEvent,
  TwitchEvent,
} from "./Events.types";
import { EventSub } from "./EventSub";
import { log } from "./log";

export class TwitchChannel {
  private emitter = new EventEmitter();
  private eventSub?: EventSub;
  private chatBot: ChatBot;

  constructor(private config: Config) {
    const twitchEmitter: TwitchEventEmitter = {
      emit: (event) => this.emitter.emit(event.type, event),
    };
    this.emitter.on("error", (error) => {
      log.error(
        twitchEmitter,
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
      this.eventSub = new EventSub(twitchEmitter, this.config, apiClient);
    }
    this.chatBot = new ChatBot(twitchEmitter, this.config, apiClient);
  }

  public on(event: "ban", handler: (param: BanEvent) => void): this;
  public on(event: "chat", handler: (param: ChatEvent) => void): this;
  public on(event: "cheer", handler: (param: CheerEvent) => void): this;
  public on(
    event: "clear-chat",
    handler: (param: ClearChatEvent) => void
  ): this;
  public on(
    event: "emotes-only",
    handler: (param: EmotesOnlyEvent) => void
  ): this;
  public on(event: "follow", handler: (param: FollowEvent) => void): this;
  public on(
    event: "followers-only",
    handler: (param: FollowersOnlyEvent) => void
  ): this;
  public on(event: "host", handler: (param: HostEvent) => void): this;
  public on(event: "hosting", handler: (param: HostingEvent) => void): this;
  public on(
    event: "message-deleted",
    handler: (param: MessageDeletedEvent) => void
  ): this;
  public on(event: "raid", handler: (param: RaidEvent) => void): this;
  public on(event: "resub", handler: (param: ResubEvent) => void): this;
  public on(event: "slow-mode", handler: (param: SlowModeEvent) => void): this;
  public on(
    event: "stream-begin",
    handler: (param: StreamBeginEvent) => void
  ): this;
  public on(
    event: "stream-change-game",
    handler: (param: StreamChangeGameEvent) => void
  ): this;
  public on(
    event: "stream-end",
    handler: (param: StreamEndEvent) => void
  ): this;
  public on(event: "sub", handler: (param: SubEvent) => void): this;
  public on(event: "subgift", handler: (param: SubgiftEvent) => void): this;
  public on(event: "subs-only", handler: (param: SubsOnlyEvent) => void): this;
  public on(event: "timeout", handler: (param: TimeoutEvent) => void): this;
  public on(event: "log", handler: (param: LogEvent) => void): this;
  public on<E extends TwitchEvent>(
    event: E["type"],
    handler: (param: E) => void
  ): this {
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

export interface TwitchEventEmitter {
  emit(event: TwitchEvent): void;
}
