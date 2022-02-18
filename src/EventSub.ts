import { ApiClient } from "@twurple/api";
import {
  EventSubChannelFollowEvent,
  EventSubChannelUpdateEvent,
  EventSubListener,
  EventSubStreamOnlineEvent,
  EventSubSubscription,
  ReverseProxyAdapter,
} from "@twurple/eventsub";
import { randomBytes } from "crypto";

import { TwitchChannel } from ".";
import { Config } from "./Config";
import { log } from "./log";

export class EventSub {
  private listener: EventSubListener;
  private subscriptions: EventSubSubscription[] = [];
  private lastGame?: string;

  public static hasRequiredConfig(config: Config): boolean {
    return config.callback_url !== undefined;
  }

  constructor(
    private twitchChannel: TwitchChannel,
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
            log.error(this.twitchChannel, message);
          } else if (level === 2) {
            log.warn(this.twitchChannel, message);
          } else if (level === 3) {
            log.info(this.twitchChannel, message);
          } else if (level === 4) {
            log.debug(this.twitchChannel, message);
          }
        },
      },
    });
  }

  public async start() {
    const stream = await this.apiClient.streams.getStreamByUserName(
      this.config.channel
    );
    this.lastGame = stream?.gameName;
    await this.listener.listen();
    const channel = await this.apiClient.users.getUserByName(
      this.config.channel
    );
    if (!channel) {
      throw new Error(`channel ${this.config.channel} in options not found`);
    }
    this.subscriptions.push(
      await this.listener.subscribeToChannelFollowEvents(channel, (event) =>
        this.onFollow(event)
      )
    );
    this.subscriptions.push(
      await this.listener.subscribeToStreamOnlineEvents(channel, (event) =>
        this.onOnline(event)
      )
    );
    this.subscriptions.push(
      await this.listener.subscribeToStreamOfflineEvents(channel, () =>
        this.onOffline()
      )
    );
    this.subscriptions.push(
      await this.listener.subscribeToChannelUpdateEvents(channel, (event) =>
        this.onUserUpdate(event)
      )
    );
  }

  public async stop() {
    await Promise.all([
      ...this.subscriptions.map((subscription) => subscription.stop()),
      this.listener.unlisten(),
    ]);
  }

  private onFollow(event: EventSubChannelFollowEvent) {
    const viewerId = event.userId;
    const viewerName = event.userDisplayName;
    this.twitchChannel.emit("follow", { viewerId, viewerName });
  }

  private async onOnline(event: EventSubStreamOnlineEvent) {
    const stream = await event.getStream();
    this.lastGame = stream.gameName;
    this.twitchChannel.emit("stream-begin", { game: stream.gameName });
  }

  private onOffline() {
    this.lastGame = undefined;
    this.twitchChannel.emit("stream-end", {});
  }

  private onUserUpdate(event: EventSubChannelUpdateEvent) {
    if (this.lastGame && this.lastGame !== event.categoryName) {
      this.lastGame = event.categoryName;
      this.twitchChannel.emit("stream-change-game", {
        game: event.categoryName,
      });
    }
  }
}
