import { ApiClient } from "@twurple/api";
import { ClientCredentialsAuthProvider } from "@twurple/auth";
import { EventEmitter } from "events";

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
  RewardRedeemEvent,
  SlowModeEvent,
  StreamBeginEvent,
  StreamChangeCategoryEvent,
  StreamChangeTitleEvent,
  StreamEndEvent,
  SubEvent,
  SubGiftEvent,
  SubGiftReceivedEvent,
  SubsOnlyEvent,
  TimeoutEvent,
  TwitchEvent,
} from "./Events.types";
import { log } from "./log";
import { ChatBot } from "./producers/ChatBot";
import { EventSub } from "./producers/EventSub";
import { ProducersOrchestrator } from "./ProducersOrchestrator";

/**
 * A small library to listen to various events that can happen on a twitch
 * channel (chat messages, raids, follows, subscriptions…)
 *
 * This library acts as a layer on top of various twitch APIs (currently: IRC
 * and EventSub) so you only have to interact with a single EventEmitter that
 * emits uniform events.
 *
 * The event objects are kept simple and without surprises.
 *
 * ## Example
 *
 * ```javascript
 * import { TwitchChannel } from "twitch-channel";
 *
 * const channel = new TwitchChannel({
 *   channel: "your_channel",
 *   clientId: "your_app_id",
 *   clientSecret: "your_app_secret",
 * });
 *
 * channel.on("sub-gift-received", ({ gifterName, recipientName }) => {
 *   console.log(`${gifterName} just subgifted ${recipientName}`);
 * });
 * channel.on("log", ({ level, message, error }) => {
 *   console.log(`[${level}] ${message}`, error);
 * });
 *
 * await channel.connect();
 * ```
 *
 * ## Connecting to sources
 *
 * Depending on which config you provide, the lib will be able to emit many types of events.
 *
 * | Event                             | Always available | Moderator IRC bot | Broadcaster IRC bot | Unauthorized EventSub | Authorized EventSub |
 * |-----------------------------------|------------------|-------------------|---------------------|-----------------------|---------------------|
 * | {@link BanEvent}                  |                  |         X         |                     |                       |          X          |
 * | {@link ChatEvent}                 |         X        |                   |                     |                       |                     |
 * | {@link CheerEvent}                |         X        |                   |                     |                       |                     |
 * | {@link ClearChatEvent}            |         X        |                   |                     |                       |                     |
 * | {@link EmotesOnlyEvent}           |         X        |                   |                     |                       |                     |
 * | {@link FollowEvent}               |                  |                   |                     |           X           |                     |
 * | {@link FollowersOnlyEvent}        |         X        |                   |                     |                       |                     |
 * | {@link HostEvent}                 |                  |                   |          X          |                       |                     |
 * | {@link HostingEvent}              |         X        |                   |                     |                       |                     |
 * | {@link HypeTrainBeginEvent}       |                  |                   |                     |                       |          X          |
 * | {@link HypeTrainEndEvent}         |                  |                   |                     |                       |          X          |
 * | {@link MessageDeletedEvent}       |         X        |                   |                     |                       |                     |
 * | {@link RaidEvent}                 |         X        |                   |                     |                       |                     |
 * | {@link RewardRedeemEvent}         |                  |                   |                     |                       |          X          |
 * | {@link SlowModeEvent}             |         X        |                   |                     |                       |                     |
 * | {@link StreamBeginEvent}          |                  |                   |                     |           X           |                     |
 * | {@link StreamChangeCategoryEvent} |                  |                   |                     |           X           |                     |
 * | {@link StreamChangeTitleEvent}    |                  |                   |                     |           X           |                     |
 * | {@link StreamEndEvent}            |                  |                   |                     |           X           |                     |
 * | {@link SubEvent}                  |         X        |                   |                     |                       |                     |
 * | {@link SubGiftReceivedEvent}      |         X        |                   |                     |                       |                     |
 * | {@link SubGiftEvent}              |                  |                   |                     |                       |          X          |
 * | {@link SubsOnlyEvent}             |         X        |                   |                     |                       |                     |
 * | {@link TimeoutEvent}              |                  |         X         |                     |                       |                     |
 *
 * ## EventSub
 *
 * EventSub is a system where twitch sends HTTPS requests to notify your
 * server.
 *
 * In order to make it work, your server must be reachable from the internet
 * with HTTPS and a domain name.
 *
 * From here you have 2 choices:
 *
 * Either you provide both {@link OptionalConfig.callbackUrl} and
 * {@link OptionalConfig.port}, and the lib will start an http server that
 * will listen to twitch's requests.
 *
 * Or, if you already have an Express-like server, you provide only
 * {@link OptionalConfig.callbackUrl} and you call
 * {@link TwitchChannel.applyEventSubMiddleware} on your server, and the lib
 * will add a middleware to your server so it receives twitch's requests.
 *
 * @category Base
 */
export class TwitchChannel {
  private emitter = new EventEmitter();
  private eventSub?: EventSub;
  private chatBot: ChatBot;
  private orchestrator: ProducersOrchestrator;

  constructor(private config: Config) {
    const twitchEmitter: TwitchEventEmitter = {
      emit: (event) => this.emitter.emit(event.type, event),
    };
    this.emitter.on("error", (error) => {
      log.error(
        twitchEmitter,
        "An uncaught error happened in a listener",
        error
      );
    });

    const authProvider = new ClientCredentialsAuthProvider(
      this.config.clientId,
      this.config.clientSecret
    );
    const apiClient = new ApiClient({ authProvider });
    if (EventSub.hasRequiredConfig(this.config)) {
      this.eventSub = new EventSub(twitchEmitter, this.config, apiClient);
    }
    this.chatBot = new ChatBot(twitchEmitter, this.config, apiClient);

    this.orchestrator = new ProducersOrchestrator(
      this.eventSub ? [this.chatBot, this.eventSub] : [this.chatBot],
      twitchEmitter
    );
  }

  public on(event: "ban", handler: (param: BanEvent) => void): void;
  public on(event: "chat", handler: (param: ChatEvent) => void): void;
  public on(event: "cheer", handler: (param: CheerEvent) => void): void;
  public on(
    event: "clear-chat",
    handler: (param: ClearChatEvent) => void
  ): void;
  public on(
    event: "emotes-only",
    handler: (param: EmotesOnlyEvent) => void
  ): void;
  public on(event: "follow", handler: (param: FollowEvent) => void): void;
  public on(
    event: "followers-only",
    handler: (param: FollowersOnlyEvent) => void
  ): void;
  public on(event: "host", handler: (param: HostEvent) => void): void;
  public on(event: "hosting", handler: (param: HostingEvent) => void): void;
  public on(
    event: "message-deleted",
    handler: (param: MessageDeletedEvent) => void
  ): void;
  public on(event: "raid", handler: (param: RaidEvent) => void): void;
  public on(
    event: "reward-redeem",
    handler: (param: RewardRedeemEvent) => void
  ): void;
  public on(event: "slow-mode", handler: (param: SlowModeEvent) => void): void;
  public on(
    event: "stream-begin",
    handler: (param: StreamBeginEvent) => void
  ): void;
  public on(
    event: "stream-change-category",
    handler: (param: StreamChangeCategoryEvent) => void
  ): void;
  public on(
    event: "stream-change-title",
    handler: (param: StreamChangeTitleEvent) => void
  ): void;
  public on(
    event: "stream-end",
    handler: (param: StreamEndEvent) => void
  ): void;
  public on(event: "sub", handler: (param: SubEvent) => void): void;
  public on(event: "sub-gift", handler: (param: SubGiftEvent) => void): void;
  public on(
    event: "sub-gift-received",
    handler: (param: SubGiftReceivedEvent) => void
  ): void;
  public on(event: "subs-only", handler: (param: SubsOnlyEvent) => void): void;
  public on(event: "timeout", handler: (param: TimeoutEvent) => void): void;
  public on(event: "log", handler: (param: LogEvent) => void): void;
  /**
   * Subscribe to an event type
   *
   * @param event the event to subscribe
   * @param handler the handler
   */
  public on<E extends TwitchEvent>(
    event: E["type"],
    handler: (param: E) => void
  ) {
    this.emitter.on(event, handler);
  }

  /**
   * Connect to the IRC chat, subscribe to EventSub, start emitting events.
   */
  public async connect() {
    await Promise.all([this.chatBot.connect(), this.eventSub?.init()]);
    await this.orchestrator.subscribeProducers();
  }

  /**
   * Disconnect from every source and stop emitting events.
   */
  public async disconnect() {
    await Promise.all([this.chatBot.disconnect(), this.eventSub?.stop()]);
    this.emitter.removeAllListeners();
  }

  /**
   * Add a middleware to your Express server so it will receive EventSub
   * notifications.
   *
   * Must be called before {@link TwitchChannel.connect}.
   *
   * See the EventSub paragraph in {@link TwitchChannel}.
   */
  public async applyEventSubMiddleware(app: any) {
    if (!this.eventSub) {
      throw new Error(
        "Cannot use EventSub when the 'callbackUrl' property is absent from the options"
      );
    }
    await this.eventSub.applyMiddleware(app);
  }
}

export interface TwitchEventEmitter {
  emit(event: TwitchEvent): void;
}
