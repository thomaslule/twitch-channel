import { ApiClient } from "@twurple/api";
import {
  EventSubChannelFollowEvent,
  EventSubChannelUpdateEvent,
  EventSubListener,
  EventSubStreamOnlineEvent,
  EventSubSubscription,
  ReverseProxyAdapter,
} from "@twurple/eventsub";
import { TwitchChannel } from ".";
import { Options } from "./options";

export class EventSub {
  private listener: EventSubListener;
  private subscriptions: EventSubSubscription[] = [];
  private lastGame?: string;

  public constructor(
    private twitchChannel: TwitchChannel,
    private options: Options,
    private apiClient: ApiClient
  ) {
    const callbackUrl = new URL(this.options.callback_url);
    this.listener = new EventSubListener({
      apiClient,
      adapter: new ReverseProxyAdapter({
        hostName: callbackUrl.hostname,
        pathPrefix: callbackUrl.pathname,
        port: this.options.port,
      }),
      secret: this.options.secret,
    });
  }

  public async start() {
    const stream = await this.apiClient.streams.getStreamByUserName(
      this.options.channel
    );
    this.lastGame = stream?.gameName;
    await this.listener.listen();
    const channel = await this.apiClient.users.getUserByName(
      this.options.channel
    );
    if (!channel) {
      throw new Error(`channel ${this.options.channel} in options not found`);
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
