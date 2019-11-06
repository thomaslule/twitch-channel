import * as TwitchHelix from "twitch-helix";
import * as TwitchWebhook from "twitch-webhook";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

// 10 days in seconds, max allowed value
const REFRESH_EVERY = 864000;

export class Webhook {
  private helix: any;
  private webhook: any;
  private intervalId: NodeJS.Timeout | undefined;
  private lastGame: string | undefined;

  constructor(private twitchChannel: TwitchChannel, private options: Options) {
    this.helix = new TwitchHelix({
      clientId: this.options.client_id,
      clientSecret: this.options.client_secret
    });
    this.webhook = new TwitchWebhook({
      client_id: this.options.client_id,
      callback: this.options.callback_url,
      secret: this.options.secret,
      lease_seconds: REFRESH_EVERY,
      listen: {
        autoStart: false
      }
    });

    this.webhook.on("users/follows", ({ event }: any) => {
      event.data.forEach((follow: any) => {
        const viewerId = follow.from_id;
        const viewerName = follow.from_name;
        twitchChannel.emit("follow", { viewerId, viewerName });
      });
    });

    this.webhook.on("streams", async ({ event }: any) => {
      try {
        if (event.data.length === 0) {
          if (this.lastGame !== undefined) {
            twitchChannel.emit("stream-end", {});
            this.lastGame = undefined;
          }
        } else {
          const game = await this.getGameName(event.data[0].game_id);
          if (this.lastGame === undefined) {
            twitchChannel.emit("stream-begin", { game });
          } else if (game !== this.lastGame) {
            twitchChannel.emit("stream-change-game", { game });
          }
          this.lastGame = game;
        }
      } catch (err) {
        this.twitchChannel.emit("error", err);
      }
    });
  }

  public async start() {
    const stream = await this.helix.getStreamInfoByUsername(
      this.options.channel
    );
    this.lastGame = stream ? await this.getGameName(stream.game_id) : undefined;
    await this.webhook.listen(this.options.port);
    await this.subscribe();
    this.intervalId = setInterval(() => this.subscribe(), REFRESH_EVERY * 1000);
  }

  public async stop() {
    if (this.intervalId) {
      await this.webhook.unsubscribe("*");
      this.twitchChannel.emit("info", "unsubscribed from webhooks");
      await this.webhook.close();
      clearInterval(this.intervalId);
    }
  }

  private async subscribe() {
    try {
      const channel = await this.helix.getTwitchUserByName(
        this.options.channel
      );
      await this.webhook.subscribe("users/follows", {
        first: 1,
        to_id: channel.id
      });
      await this.webhook.subscribe("streams", { user_id: channel.id });
      this.twitchChannel.emit("info", "subscribed to webhooks");
    } catch (err) {
      this.twitchChannel.emit("error", err);
    }
  }

  private async getGameName(gameId: string) {
    const games = await this.helix.sendHelixRequest(`games?id=${gameId}`);
    // in some cases, twitch doesnt find the game
    return games.length > 0 ? games[0].name : "";
  }
}
