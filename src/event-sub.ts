import { ApiClient } from "@twurple/api";
import {
  EventSubChannelFollowEvent,
  EventSubListener,
  EventSubSubscription,
  ReverseProxyAdapter,
} from "@twurple/eventsub";
import { TwitchChannel } from ".";
import { Options } from "./options";

export class EventSub {
  private listener: EventSubListener;
  private subscriptions: EventSubSubscription[] = [];

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
}
