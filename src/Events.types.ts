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
  | MessageDeletedEvent
  | RaidEvent
  | ResubEvent
  | SlowModeEvent
  | StreamBeginEvent
  | StreamChangeGameEvent
  | StreamEndEvent
  | SubEvent
  | SubgiftEvent
  | SubsOnlyEvent
  | TimeoutEvent
  | LogEvent;

export type EventType = TwitchEvent["type"];

export interface BanEvent {
  type: "ban";
  viewerId: string;
  viewerName: string;
}

export interface ChatEvent {
  type: "chat";
  viewerId: string;
  viewerName: string;
  message: string;
}

export interface CheerEvent {
  type: "cheer";
  viewerId: string;
  viewerName: string;
  amount: number;
  message: string;
}

export interface ClearChatEvent {
  type: "clear-chat";
}

export interface EmotesOnlyEvent {
  type: "emotes-only";
}

export interface FollowEvent {
  type: "follow";
  viewerId: string;
  viewerName: string;
}

export interface FollowersOnlyEvent {
  type: "followers-only";
  enabled: boolean;
  followAge: number;
}

export interface HostEvent {
  type: "host";
  viewerId: string;
  viewerName: string;
  viewers: number;
  autohost: boolean;
}

export interface HostingEvent {
  type: "hosting";
  targetId: string;
  targetName: string;
  viewers: number;
}

export interface MessageDeletedEvent {
  type: "message-deleted";
  viewerId: string;
  viewerName: string;
  deletedMessage: string;
}

export interface RaidEvent {
  type: "raid";
  viewerId: string;
  viewerName: string;
  viewers: number;
}

export interface ResubEvent {
  type: "resub";
  viewerId: string;
  viewerName: string;
  message?: string;
  months?: number;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}

export interface SlowModeEvent {
  type: "slow-mode";
  enabled: boolean;
  interval: number;
}

export interface StreamBeginEvent {
  type: "stream-begin";
  game: string;
}

export interface StreamChangeGameEvent {
  type: "stream-change-game";
  game: string;
}

export interface StreamEndEvent {
  type: "stream-end";
}

export interface SubEvent {
  type: "sub";
  viewerId: string;
  viewerName: string;
  message?: string;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}

export interface SubgiftEvent {
  type: "subgift";
  viewerId: string;
  viewerName: string;
  recipientId: string;
  recipientName: string;
  plan?: "Prime" | "1000" | "2000" | "3000";
  planName?: string;
}

export interface SubsOnlyEvent {
  type: "subs-only";
  enabled: boolean;
}

export interface TimeoutEvent {
  type: "timeout";
  viewerId: string;
  viewerName: string;
  duration: number;
}

export interface LogEvent {
  type: "log";
  level: "error" | "warn" | "info" | "debug";
  message: string;
  error?: unknown;
}