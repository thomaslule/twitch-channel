import { ApiClient, HelixUser } from "@twurple/api";
import {
  EventSubChannelFollowEvent,
  EventSubChannelUpdateEvent,
  EventSubListener,
  EventSubStreamOnlineEvent,
  EventSubSubscription,
  ReverseProxyAdapter,
} from "@twurple/eventsub";
import { randomBytes } from "crypto";

import { Config } from "../Config";
import { EventType } from "../Events.types";
import { log } from "../log";
import { TwitchEventEmitter } from "../TwitchChannel";
import { Producer } from "./Producer.types";

export class EventSub implements Producer {
  public name = "EventSub";
  private listener: EventSubListener;
  private subscriptions: EventSubSubscription[] = [];
  private channel!: HelixUser;
  private lastGame?: string;

  public static hasRequiredConfig(config: Config): boolean {
    return config.callback_url !== undefined;
  }

  constructor(
    private emitter: TwitchEventEmitter,
    private config: Config,
    private apiClient: ApiClient
  ) {
    const callbackUrl = new URL(this.config.callback_url!);
    this.listener = new EventSubListener({
      apiClient,
      adapter: new ReverseProxyAdapter({
        hostName: callbackUrl.hostname,
        pathPrefix: callbackUrl.pathname,
        port: this.config.port,
      }),
      secret: randomBytes(20).toString("hex"),
      logger: {
        custom: (level, message) => {
          if (level === 0 || level === 1) {
            log.error(this.emitter, message);
          } else if (level === 2) {
            log.warn(this.emitter, message);
          } else if (level === 3) {
            log.info(this.emitter, message);
          } else if (level === 4) {
            log.debug(this.emitter, message);
          }
        },
      },
    });
  }

  public async init() {
    const channel = await this.apiClient.users.getUserByName(
      this.config.channel
    );
    if (!channel) {
      throw new Error("config.channel not found");
    }
    this.channel = channel;

    const stream = await this.apiClient.streams.getStreamByUserName(
      this.config.channel
    );
    this.lastGame = stream?.gameName;

    await this.listener.listen();
  }

  public async produceEvents(type: EventType): Promise<boolean> {
    try {
      if (type === "follow") {
        this.subscriptions.push(
          await this.listener.subscribeToChannelFollowEvents(
            this.channel,
            (event) => this.onFollow(event)
          )
        );
        return true;
      } else if (type === "stream-begin") {
        this.subscriptions.push(
          await this.listener.subscribeToStreamOnlineEvents(
            this.channel,
            (event) => this.onOnline(event)
          )
        );
        return true;
      } else if (type === "stream-change-game") {
        this.subscriptions.push(
          await this.listener.subscribeToChannelUpdateEvents(
            this.channel,
            (event) => this.onUserUpdate(event)
          )
        );
        return true;
      } else if (type === "stream-end") {
        this.subscriptions.push(
          await this.listener.subscribeToStreamOfflineEvents(this.channel, () =>
            this.onOffline()
          )
        );
        return true;
      } else {
        return false;
      }
    } catch (error) {
      log.error(
        this.emitter,
        `event sub failed to subscribe to ${type} event`,
        error
      );
      return false;
    }
  }

  public async stop() {
    await Promise.all(
      this.subscriptions.map((subscription) => subscription.stop())
    );
    await this.listener.unlisten();
  }

  private onFollow(event: EventSubChannelFollowEvent) {
    const viewerId = event.userId;
    const viewerName = event.userDisplayName;
    this.emitter.emit({ type: "follow", viewerId, viewerName });
  }

  private async onOnline(event: EventSubStreamOnlineEvent) {
    const stream = await event.getStream();
    this.lastGame = stream.gameName;
    this.emitter.emit({
      type: "stream-begin",
      game: stream.gameName,
    });
  }

  private onOffline() {
    this.lastGame = undefined;
    this.emitter.emit({ type: "stream-end" });
  }

  private onUserUpdate(event: EventSubChannelUpdateEvent) {
    if (this.lastGame && this.lastGame !== event.categoryName) {
      this.lastGame = event.categoryName;
      this.emitter.emit({
        type: "stream-change-game",
        game: event.categoryName,
      });
    }
  }
}
