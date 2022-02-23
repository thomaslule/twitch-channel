/**
 * @category Events
 */
export type TwitchEvent =
  | BanEvent
  | ChatEvent
  | CheerEvent
  | ClearChatEvent
  | EmotesOnlyEvent
  | FollowEvent
  | FollowersOnlyEvent
  | HostEvent
  | HostingEvent
  | HypeTrainBeginEvent
  | HypeTrainEndEvent
  | MessageDeletedEvent
  | RaidEvent
  | RewardRedeemEvent
  | SlowModeEvent
  | StreamBeginEvent
  | StreamChangeCategoryEvent
  | StreamChangeTitleEvent
  | StreamEndEvent
  | SubEvent
  | SubGiftReceivedEvent
  | SubGiftEvent
  | SubsOnlyEvent
  | TimeoutEvent
  | LogEvent;

/**
 * @category Events
 */
export type EventType = TwitchEvent["type"];

/**
 * Emitted when a viewer is banned from the channel.
 *
 * @category Events
 */
export interface BanEvent {
  type: "ban";
  viewerId: string;
  viewerName: string;
}

/**
 * Emitted when a viewer sends a chat message.
 *
 * @category Events
 */
export interface ChatEvent {
  type: "chat";
  viewerId: string;
  viewerName: string;
  message: string;
}

/**
 * Emitted when a viewer send bits.
 *
 * @category Events
 */
export interface CheerEvent {
  type: "cheer";
  viewerId: string;
  viewerName: string;
  amount: number;
  message: string;
}

/**
 * Emitted when the chat is cleared.
 *
 * @category Events
 */
export interface ClearChatEvent {
  type: "clear-chat";
}

/**
 * Emitted when the emote only mode is enabled or disabled.
 *
 * @category Events
 */
export interface EmotesOnlyEvent {
  type: "emotes-only";
  enabled: boolean;
}

/**
 * Emitted when a viewer follows the channel.
 *
 * @category Events
 */
export interface FollowEvent {
  type: "follow";
  viewerId: string;
  viewerName: string;
}

/**
 * Emitted when the followers only is enabled or disabled.
 *
 * @category Events
 */
export interface FollowersOnlyEvent {
  type: "followers-only";
  enabled: boolean;
  /**
   * In minutes
   */
  followAge: number;
}

/**
 * Emitted when the channel is hosted by another channel.
 *
 * @category Events
 */
export interface HostEvent {
  type: "host";
  viewerId: string;
  viewerName: string;
  viewers: number;
  autohost: boolean;
}

/**
 * Emitted when the channel hosts another channel.
 *
 * @category Events
 */
export interface HostingEvent {
  type: "hosting";
  targetId: string;
  targetName: string;
  viewers: number;
}

/**
 * Emitted when the hype train starts.
 *
 * @category Events
 */
export interface HypeTrainBeginEvent {
  type: "hype-train-begin";
}

/**
 * Emitted when the hype train ends.
 *
 * @category Events
 */
export interface HypeTrainEndEvent {
  type: "hype-train-end";
  level: number;
  topViewers: Array<{ viewerId: string; viewerName: string }>;
}

/**
 * Emitted when a message is deleted.
 *
 * @category Events
 */
export interface MessageDeletedEvent {
  type: "message-deleted";
  viewerId: string;
  viewerName: string;
  message: string;
}

/**
 * Emitted when the channel receives a raid from another channel.
 *
 * @category Events
 */
export interface RaidEvent {
  type: "raid";
  viewerId: string;
  viewerName: string;
  viewers: number;
}

/**
 * Emitted when a viewer redeems a reward with their channel points.
 *
 * @category Events
 */
export interface RewardRedeemEvent {
  type: "reward-redeem";
  viewerId: string;
  viewerName: string;
  rewardId: string;
  rewartTitle: string;
  rewardCost: number;
  message: string;
}

/**
 * Emitted when the slow mode is enabled or disabled in chat.
 *
 * @category Events
 */
export interface SlowModeEvent {
  type: "slow-mode";
  enabled: boolean;
  /**
   * In seconds.
   */
  interval: number;
}

/**
 * Emitted when a broadcast starts.
 *
 * @category Events
 */
export interface StreamBeginEvent {
  type: "stream-begin";
  categoryId: string;
  categoryName: string;
  title: string;
}

/**
 * Emitted when the category/game changes.
 *
 * @category Events
 */
export interface StreamChangeCategoryEvent {
  type: "stream-change-category";
  categoryId: string;
  categoryName: string;
}

/**
 * Emitted when the broadcast title changes.
 *
 * @category Events
 */
export interface StreamChangeTitleEvent {
  type: "stream-change-title";
  title: string;
}

/**
 * Emitted when the broadcast stops.
 *
 * @category Events
 */
export interface StreamEndEvent {
  type: "stream-end";
}

/**
 * Emitted when a viewer subscribes or shares a resubscription.
 *
 * @category Events
 */
export interface SubEvent {
  type: "sub";
  viewerId: string;
  viewerName: string;
  message: string;
  months: number;
  /**
   * Prime subs are considered a tier "1000".
   */
  tier: "1000" | "2000" | "3000";
}

/**
 * Emitted when a viewer offers one or more subscriptions.
 *
 * If a viewer offers 10 subscriptions at once, there will be 1 `sub-gift` event and 10 `sub-gift-received` events.
 *
 * @category Events
 */
export interface SubGiftEvent {
  type: "sub-gift";
  /**
   * Can be undefined if it is an anonymous gift.
   */
  viewerId?: string;
  /**
   * Can be undefined if it is an anonymous gift.
   */
  viewerName?: string;
  number: number;
  /**
   * The cumulative number of gifts from this user.
   *
   * Can be undefined if not shared.
   */
  total?: number;
  /**
   * Prime subs are considered a tier "1000".
   */
  tier: "1000" | "2000" | "3000";
}

/**
 * Emitted when a viewer receives a subscription.
 *
 * If a viewer offers 10 subscriptions at once, there will be 1 `sub-gift` event and 10 `sub-gift-received` events.
 *
 * @category Events
 */
export interface SubGiftReceivedEvent {
  type: "sub-gift-received";
  recipientId: string;
  recipientName: string;
  /**
   * Can be undefined if it is an anonymous gift.
   */
  gifterId?: string;
  /**
   * Can be undefined if it is an anonymous gift.
   */
  gifterName?: string;
  /**
   * Prime subs are considered a tier "1000".
   */
  tier: "1000" | "2000" | "3000";
}

/**
 * Emitted when the subs only mode is enabled or disabled.
 *
 * @category Events
 */
export interface SubsOnlyEvent {
  type: "subs-only";
  enabled: boolean;
}

/**
 * Emitted when a viewer is temporarily banned.
 *
 * @category Events
 */
export interface TimeoutEvent {
  type: "timeout";
  viewerId: string;
  viewerName: string;
  /**
   * In seconds.
   */
  duration: number;
}

/**
 * Emitted each time the TwitchChannel library wants to log something.
 *
 * By default, nothing is logged to the console. You need to listen to this event to receive logs.
 *
 * @category Special events
 */
export interface LogEvent {
  type: "log";
  level: "error" | "warn" | "info" | "debug";
  message: string;
  /**
   * Only present when level === "error"
   */
  error?: unknown;
}
