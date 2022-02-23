import { ApiClient, HelixUser } from "@twurple/api";
import {
  EventSubChannelBanEvent,
  EventSubChannelFollowEvent,
  EventSubChannelHypeTrainEndEvent,
  EventSubChannelRedemptionAddEvent,
  EventSubChannelSubscriptionGiftEvent,
  EventSubChannelUpdateEvent,
  EventSubListener,
  EventSubMiddleware,
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
  private eventSub: EventSubListener | EventSubMiddleware;
  private subscriptions: EventSubSubscription[] = [];
  private channel!: HelixUser;
  private lastCategory?: string;
  private lastTitle?: string;

  public static hasRequiredConfig(config: Config): boolean {
    return config.callbackUrl !== undefined;
  }

  constructor(
    private emitter: TwitchEventEmitter,
    private config: Config,
    private apiClient: ApiClient
  ) {
    const callbackUrl = new URL(this.config.callbackUrl!);
    const secret = randomBytes(20).toString("hex");
    const logger = {
      custom: (level: number, message: string) => {
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
    };
    if (this.config.port) {
      this.eventSub = new EventSubListener({
        apiClient,
        adapter: new ReverseProxyAdapter({
          hostName: callbackUrl.hostname,
          pathPrefix: callbackUrl.pathname,
          port: this.config.port,
        }),
        secret,
        logger,
      });
    } else {
      this.eventSub = new EventSubMiddleware({
        apiClient,
        hostName: callbackUrl.hostname,
        pathPrefix: callbackUrl.pathname,
        secret,
        logger,
      });
    }
  }

  public async applyMiddleware(app: any) {
    if (this.eventSub instanceof EventSubMiddleware) {
      await this.eventSub.apply(app);
    } else {
      throw new Error(
        "Cannot use EventSub middleware when the 'port' property is present in the options"
      );
    }
  }

  public async init() {
    const channel = await this.apiClient.users.getUserByName(
      this.config.channel
    );
    if (!channel) {
      throw new Error("config.channel not found");
    }
    this.channel = channel;

    if (this.eventSub instanceof EventSubListener) {
      await this.eventSub.listen();
    } else {
      await this.eventSub.markAsReady();
    }
  }

  public async produceEvents(type: EventType): Promise<boolean> {
    try {
      let subscription: EventSubSubscription | undefined;
      let noSubscriptionNeeded = false;
      if (type === "ban") {
        subscription = await this.eventSub.subscribeToChannelBanEvents(
          this.channel,
          (event) => this.onBan(event)
        );
      } else if (type === "follow") {
        subscription = await this.eventSub.subscribeToChannelFollowEvents(
          this.channel,
          (event) => this.onFollow(event)
        );
      } else if (type === "hype-train-begin") {
        subscription =
          await this.eventSub.subscribeToChannelHypeTrainBeginEvents(
            this.channel,
            () => {
              this.emitter.emit({ type });
            }
          );
      } else if (type === "hype-train-end") {
        subscription = await this.eventSub.subscribeToChannelHypeTrainEndEvents(
          this.channel,
          (event) => this.onHypeTrainEnd(event)
        );
      } else if (type === "reward-redeem") {
        subscription =
          await this.eventSub.subscribeToChannelRedemptionAddEvents(
            this.channel,
            (event) => this.onRewardRedeem(event)
          );
      } else if (type === "sub-gift") {
        subscription =
          await this.eventSub.subscribeToChannelSubscriptionGiftEvents(
            this.channel,
            (event) => this.onSubGift(event)
          );
      } else if (type === "stream-begin") {
        subscription = await this.eventSub.subscribeToStreamOnlineEvents(
          this.channel,
          (event) => this.onOnline(event)
        );
      } else if (type === "stream-change-category") {
        if (!this.lastCategory && !this.lastTitle) {
          // we are not yet subscribed to channel updates
          subscription = await this.eventSub.subscribeToChannelUpdateEvents(
            this.channel,
            (event) => this.onChannelUpdate(event)
          );
        }
        const channel = await this.apiClient.channels.getChannelInfo(
          this.channel.id
        );
        this.lastCategory = channel!.gameId;
        noSubscriptionNeeded = true;
      } else if (type === "stream-change-title") {
        if (!this.lastCategory && !this.lastTitle) {
          // we are not yet subscribed to channel updates
          subscription = await this.eventSub.subscribeToChannelUpdateEvents(
            this.channel,
            (event) => this.onChannelUpdate(event)
          );
        }
        const channel = await this.apiClient.channels.getChannelInfo(
          this.channel.id
        );
        this.lastTitle = channel!.title;
        noSubscriptionNeeded = true;
      } else if (type === "stream-end") {
        subscription = await this.eventSub.subscribeToStreamOfflineEvents(
          this.channel,
          () => this.onOffline()
        );
      }
      if (subscription) {
        this.subscriptions.push(subscription);
        return true;
      } else if (noSubscriptionNeeded) {
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
    if (this.eventSub instanceof EventSubListener) {
      await this.eventSub.unlisten();
    }
  }

  public onBan(event: EventSubChannelBanEvent): void {
    this.emitter.emit({
      type: "ban",
      viewerId: event.userId,
      viewerName: event.userDisplayName,
    });
  }

  private onChannelUpdate(event: EventSubChannelUpdateEvent) {
    if (this.lastCategory && this.lastCategory !== event.categoryId) {
      this.lastCategory = event.categoryId;
      this.emitter.emit({
        type: "stream-change-category",
        categoryId: event.categoryId,
        categoryName: event.categoryName,
      });
    }
    if (this.lastTitle && this.lastTitle !== event.streamTitle) {
      this.lastTitle = event.streamTitle;
      this.emitter.emit({
        type: "stream-change-title",
        title: event.streamTitle,
      });
    }
  }

  private onFollow(event: EventSubChannelFollowEvent) {
    this.emitter.emit({
      type: "follow",
      viewerId: event.userId,
      viewerName: event.userDisplayName,
    });
  }

  private onHypeTrainEnd(event: EventSubChannelHypeTrainEndEvent): void {
    this.emitter.emit({
      type: "hype-train-end",
      level: event.level,
      topViewers: event.topContributors.map((viewer) => ({
        viewerId: viewer.userId,
        viewerName: viewer.userDisplayName,
      })),
    });
  }

  private async onOnline(event: EventSubStreamOnlineEvent) {
    try {
      const channel = await this.apiClient.channels.getChannelInfo(
        event.broadcasterId
      );
      this.emitter.emit({
        type: "stream-begin",
        categoryId: channel!.gameId,
        categoryName: channel!.gameName,
        title: channel!.title,
      });
    } catch (err) {
      log.error(this.emitter, "Error during stream-begin event", err);
    }
  }

  private onOffline() {
    this.emitter.emit({ type: "stream-end" });
  }

  private onRewardRedeem(event: EventSubChannelRedemptionAddEvent) {
    this.emitter.emit({
      type: "reward-redeem",
      viewerId: event.userId,
      viewerName: event.userDisplayName,
      rewardId: event.rewardId,
      rewartTitle: event.rewardTitle,
      rewardCost: event.rewardCost,
      message: event.input,
    });
  }

  private onSubGift(event: EventSubChannelSubscriptionGiftEvent): void {
    this.emitter.emit({
      type: "sub-gift",
      viewerId: event.gifterId ?? undefined,
      viewerName: event.gifterDisplayName ?? undefined,
      number: event.amount,
      tier: event.tier,
      total: event.cumulativeAmount ?? undefined,
    });
  }
}
