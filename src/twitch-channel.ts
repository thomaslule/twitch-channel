import { EventEmitter } from "events";
import * as TwitchHelix from "twitch-helix";
import { ChatBot } from "./chat-bot";
import { getWithDefault, MandatoryOptions, Options } from "./options";
import { Streamlabs } from "./streamlabs";
import { Webhook } from "./webhook";

export class TwitchChannel extends EventEmitter {
  private options: Options;
  private webhook: Webhook;
  private chatBot: ChatBot;
  private streamlabs?: Streamlabs;
  private helix: any;

  constructor(opts: MandatoryOptions & Partial<Options>) {
    super();
    this.options = getWithDefault(opts);
    this.webhook = new Webhook(this, this.options);
    this.chatBot = new ChatBot(this, this.options);
    this.streamlabs = this.options.streamlabs_socket_token
      ? new Streamlabs(this, this.options)
      : undefined;
    this.helix = new TwitchHelix({ clientId: this.options.client_id, clientSecret: this.options.client_secret });
  }

  public async connect() {
    if (this.options.streamlabs_socket_token) {
      this.streamlabs!.start();
    }
    await this.chatBot.connect();
    await this.webhook.start();
  }

  public async disconnect() {
    if (this.options.streamlabs_socket_token) {
      this.streamlabs!.stop();
    }
    await this.chatBot.disconnect();
    await this.webhook.stop();
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
    const twitchUser = await this.helix.getTwitchUserByName(login);
    return twitchUser ? twitchUser : undefined;
  }

  public async getTopClipper() {
    const now = new Date().toISOString();
    const lastWeek = new Date(new Date().getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
    const channel = await this.helix.getTwitchUserByName(this.options.channel);
    const path = `clips?broadcaster_id=${channel.id}&started_at=${lastWeek}&ended_at=${now}&first=1`;
    const res = await this.helix.sendHelixRequest(path);
    if (res.length === 0) { return undefined; }
    const viewerId = res[0].creator_id;
    const viewerName = res[0].creator_name;
    return { viewerId, viewerName };
  }

}
