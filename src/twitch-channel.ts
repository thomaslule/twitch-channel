import { ApiClient } from "@twurple/api";
import { ClientCredentialsAuthProvider } from "@twurple/auth";
import { EventEmitter } from "events";
import { ChatBot } from "./chat-bot";
import { EventSub } from "./event-sub";
import { getWithDefault, MandatoryOptions, Options } from "./options";
import { Streamlabs } from "./streamlabs";

export class TwitchChannel extends EventEmitter {
  private options: Options;
  private chatBot: ChatBot;
  private streamlabs?: Streamlabs;
  private eventSub: EventSub;
  private apiClient: ApiClient;

  constructor(opts: MandatoryOptions & Partial<Options>) {
    super();
    this.options = getWithDefault(opts);
    this.chatBot = new ChatBot(this, this.options);
    this.streamlabs = this.options.streamlabs_socket_token
      ? new Streamlabs(this, this.options)
      : undefined;
    const authProvider = new ClientCredentialsAuthProvider(
      this.options.client_id,
      this.options.client_secret
    );
    this.apiClient = new ApiClient({ authProvider });
    this.eventSub = new EventSub(this, this.options, this.apiClient);
  }

  public on(event: "debug", handler: (param: string) => void): this;
  public on(event: "info", handler: (param: string) => void): this;
  public on(event: "error", handler: (param: string | object) => void): this;
  public on(
    event: "chat",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message: string;
    }) => void
  ): this;
  public on(
    event: "cheer",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      amount: number;
      message: string;
    }) => void
  ): this;
  public on(
    event: "sub",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message?: string;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "resub",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      message?: string;
      months?: number;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "subgift",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      recipientId: string;
      recipientName: string;
      plan?: "Prime" | "1000" | "2000" | "3000";
      planName?: string;
    }) => void
  ): this;
  public on(
    event: "host",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      viewers: number;
    }) => void
  ): this;
  public on(
    event: "raid",
    handler: (param: {
      viewerId: string;
      viewerName: string;
      viewers: number;
    }) => void
  ): this;
  public on(
    event: "follow",
    handler: (param: { viewerId: string; viewerName: string }) => void
  ): this;
  public on(
    event: "ban",
    handler: (param: { viewerId: string; viewerName: string }) => void
  ): this;
  public on(
    event: "stream-begin",
    handler: (param: { game: string }) => void
  ): this;
  public on(
    event: "stream-change-game",
    handler: (param: { game: string }) => void
  ): this;
  public on(event: "stream-end", handler: () => void): this;
  public on(
    event: "streamlabs/donation",
    handler: (param: {
      viewerId?: string;
      viewerName: string;
      amount: number;
      currency: string;
      message?: string;
    }) => void
  ): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this;
  public on(event: string | symbol, handler: (...args: any[]) => void): this {
    super.on(event, handler);
    return this;
  }

  public async connect() {
    if (this.options.streamlabs_socket_token) {
      this.streamlabs!.start();
    }
    await this.chatBot.connect();
    await this.eventSub.start();
  }

  public async disconnect() {
    if (this.options.streamlabs_socket_token) {
      this.streamlabs!.stop();
    }
    await this.chatBot.disconnect();
    await this.eventSub.stop();
  }

  public say(message: string) {
    this.chatBot.say(message);
  }

  public async getTwitchUserByName(name: string) {
    const login = name
      .normalize("NFD") // split accented characters : è => e`
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const twitchUser = await this.apiClient.helix.users.getUserByName(login);
    return twitchUser ? twitchUser : undefined;
  }

  public async getTopClipper() {
    const now = new Date().toISOString();
    const lastWeek = new Date(
      new Date().getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const channel = await this.getTwitchUserByName(this.options.channel);
    if (channel === undefined) {
      throw new Error(`channel ${this.options.channel} in options not found`);
    }
    const res = await this.apiClient.helix.clips.getClipsForBroadcaster(
      channel.id,
      { startDate: lastWeek, endDate: now }
    );
    if (res.data.length === 0) {
      return undefined;
    }
    const viewerId = res.data[0].creatorId;
    const viewerName = res.data[0].creatorDisplayName;
    return { viewerId, viewerName };
  }
}
