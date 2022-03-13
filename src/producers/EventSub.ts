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
  EventSubStreamOfflineEvent,
  EventSubStreamOnlineEvent,
  EventSubSubscription,
  ReverseProxyAdapter,
} from "@twurple/eventsub";
import { randomBytes } from "crypto";
import { Express } from "express";

import { Config } from "../Config";
import { EventType } from "../Events.types";
import { log } from "../log";
import { TwitchEventEmitter } from "../TwitchChannel";
import { Producer } from "./Producer.types";

export class EventSub implements Producer {
  public name = "EventSub";
  private eventSub: EventSubListener | EventSubMiddleware;
  private subscriptions: Subscription[] = [];
  private emittedTypes: EventType[] = [];
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
          log.error(this.emitter, `EventSub: ${message}`);
        } else if (level === 2) {
          log.warn(this.emitter, `EventSub: ${message}`);
        } else if (level === 3) {
          log.info(this.emitter, `EventSub: ${message}`);
        } else if (level === 4) {
          log.debug(this.emitter, `EventSub: ${message}`);
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

  public applyMiddleware(app: Express) {
    if (this.eventSub instanceof EventSubMiddleware) {
      this.eventSub.apply(app);
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
      if (type === "ban") {
        if (
          !this.subscriptions.find(
            ({ eventClass }) => eventClass === EventSubChannelBanEvent
          )
        ) {
          const subscription = await this.eventSub.subscribeToChannelBanEvents(
            this.channel,
            (event) => this.logErrors(type, () => this.onBan(event))
          );
          this.subscriptions.push({
            eventClass: EventSubChannelBanEvent,
            eventSubSubscription: subscription,
          });
        }
      } else if (type === "follow") {
        const subscription = await this.eventSub.subscribeToChannelFollowEvents(
          this.channel,
          (event) => this.logErrors(type, () => this.onFollow(event))
        );
        this.subscriptions.push({
          eventClass: EventSubChannelBanEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "hype-train-begin") {
        const subscription =
          await this.eventSub.subscribeToChannelHypeTrainBeginEvents(
            this.channel,
            () => {
              this.emitter.emit({ type });
            }
          );
        this.subscriptions.push({
          eventClass: EventSubChannelBanEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "hype-train-end") {
        const subscription =
          await this.eventSub.subscribeToChannelHypeTrainEndEvents(
            this.channel,
            (event) => this.logErrors(type, () => this.onHypeTrainEnd(event))
          );
        this.subscriptions.push({
          eventClass: EventSubChannelHypeTrainEndEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "reward-redeem") {
        const subscription =
          await this.eventSub.subscribeToChannelRedemptionAddEvents(
            this.channel,
            (event) => this.logErrors(type, () => this.onRewardRedeem(event))
          );
        this.subscriptions.push({
          eventClass: EventSubChannelRedemptionAddEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "sub-gift") {
        const subscription =
          await this.eventSub.subscribeToChannelSubscriptionGiftEvents(
            this.channel,
            (event) => this.logErrors(type, () => this.onSubGift(event))
          );
        this.subscriptions.push({
          eventClass: EventSubChannelSubscriptionGiftEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "stream-begin") {
        const subscription = await this.eventSub.subscribeToStreamOnlineEvents(
          this.channel,
          (event) => this.logErrors(type, () => this.onOnline(event))
        );
        this.subscriptions.push({
          eventClass: EventSubStreamOnlineEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "stream-change-category") {
        if (!this.lastCategory && !this.lastTitle) {
          // we are not yet subscribed to channel updates
          const subscription =
            await this.eventSub.subscribeToChannelUpdateEvents(
              this.channel,
              (event) =>
                this.logErrors("channel-update", () =>
                  this.onChannelUpdate(event)
                )
            );
          this.subscriptions.push({
            eventClass: EventSubChannelUpdateEvent,
            eventSubSubscription: subscription,
          });
        }
        const channel = await this.apiClient.channels.getChannelInfo(
          this.channel.id
        );
        this.lastCategory = channel!.gameId;
      } else if (type === "stream-change-title") {
        if (
          !this.subscriptions.find(
            ({ eventClass }) => eventClass === EventSubChannelUpdateEvent
          )
        ) {
          const subscription =
            await this.eventSub.subscribeToChannelUpdateEvents(
              this.channel,
              (event) =>
                this.logErrors("channel-update", () =>
                  this.onChannelUpdate(event)
                )
            );
          this.subscriptions.push({
            eventClass: EventSubChannelUpdateEvent,
            eventSubSubscription: subscription,
          });
        }
        const channel = await this.apiClient.channels.getChannelInfo(
          this.channel.id
        );
        this.lastTitle = channel!.title;
      } else if (type === "stream-end") {
        const subscription = await this.eventSub.subscribeToStreamOfflineEvents(
          this.channel,
          () => this.logErrors(type, () => this.onOffline())
        );
        this.subscriptions.push({
          eventClass: EventSubStreamOfflineEvent,
          eventSubSubscription: subscription,
        });
      } else if (type === "timeout") {
        if (
          !this.subscriptions.find(
            ({ eventClass }) => eventClass === EventSubChannelBanEvent
          )
        ) {
          const subscription = await this.eventSub.subscribeToChannelBanEvents(
            this.channel,
            (event) => this.logErrors(type, () => this.onBan(event))
          );
          this.subscriptions.push({
            eventClass: EventSubChannelBanEvent,
            eventSubSubscription: subscription,
          });
        }
      } else {
        return false;
      }
      this.emittedTypes.push(type);
      return true;
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 403) {
        log.info(
          this.emitter,
          `EventSub failed to subscribe to ${type} event because the target channel did not authorize the client`
        );
      } else {
        log.error(
          this.emitter,
          `EventSub failed to subscribe to ${type} event`,
          error
        );
      }
      return false;
    }
  }

  public async stop() {
    await Promise.all(
      this.subscriptions.map(({ eventSubSubscription }) =>
        eventSubSubscription.stop()
      )
    );
    if (this.eventSub instanceof EventSubListener) {
      await this.eventSub.unlisten();
    }
  }

  public onBan(event: EventSubChannelBanEvent): void {
    if (event.isPermanent && this.emittedTypes.includes("ban")) {
      this.emitter.emit({
        type: "ban",
        viewerId: event.userId,
        viewerName: event.userDisplayName,
      });
    } else if (!event.isPermanent && this.emittedTypes.includes("timeout")) {
      this.emitter.emit({
        type: "timeout",
        viewerId: event.userId,
        viewerName: event.userDisplayName,
        duration: Math.round((event.endDate!.getTime() - Date.now()) / 1000),
      });
    }
  }

  private onChannelUpdate(event: EventSubChannelUpdateEvent) {
    if (
      this.emittedTypes.includes("stream-change-category") &&
      this.lastCategory !== event.categoryId
    ) {
      this.lastCategory = event.categoryId;
      this.emitter.emit({
        type: "stream-change-category",
        categoryId: event.categoryId,
        categoryName: event.categoryName,
      });
    }
    if (
      this.emittedTypes.includes("stream-change-title") &&
      this.lastTitle !== event.streamTitle
    ) {
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

  private async logErrors(
    tmiEvent: string,
    handler: () => void | Promise<void>
  ) {
    try {
      await handler();
    } catch (error) {
      log.error(
        this.emitter,
        `An error happened during an EventSub ${tmiEvent} event`,
        error
      );
    }
  }
}

interface Subscription {
  eventClass: Class;
  eventSubSubscription: EventSubSubscription;
}

interface Class {
  new (...args: any[]): unknown;
}
