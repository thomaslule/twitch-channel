import TwitchClient from "twitch";
import TwitchWebhook, {
  FollowsFromUserSubscription,
  StreamChangeSubscription
} from "twitch-webhooks";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class Webhook {
  private twitchClient: TwitchClient;
  private webhook?: TwitchWebhook;
  private lastGame: string | undefined;
  private followSubscription?: FollowsFromUserSubscription;
  private streamSubscription?: StreamChangeSubscription;

  constructor(private twitchChannel: TwitchChannel, private options: Options) {
    this.twitchClient = TwitchClient.withClientCredentials(
      this.options.client_id,
      this.options.client_secret
    );
  }

  public async start() {
    const stream = await this.twitchClient.helix.streams.getStreamByUserName(
      this.options.channel
    );
    this.lastGame = stream ? await this.getGameName(stream.gameId) : undefined;
    this.webhook = await TwitchWebhook.create(
      this.twitchClient,
      this.getCallbackProperties()
    );
    this.webhook.listen();
    await this.subscribe();
  }

  public async stop() {
    if (this.webhook) {
      this.webhook.unlisten();
      await this.followSubscription!.stop();
      await this.streamSubscription!.stop();
    }
  }

  private async subscribe() {
    try {
      const channel = await this.twitchClient.helix.users.getUserByName(
        this.options.channel
      );
      if (!channel) {
        throw new Error(`channel ${this.options.channel} in options not found`);
      }
      await this.webhook!.subscribeToFollowsToUser(channel.id, follow => {
        const viewerId = follow.userId;
        const viewerName = follow.userDisplayName;
        this.twitchChannel.emit("follow", { viewerId, viewerName });
      });
      await this.webhook!.subscribeToStreamChanges(channel.id, async stream => {
        try {
          if (!stream) {
            if (this.lastGame !== undefined) {
              this.twitchChannel.emit("stream-end", {});
              this.lastGame = undefined;
            }
          } else {
            const game = await this.getGameName(stream.gameId);
            if (this.lastGame === undefined) {
              this.twitchChannel.emit("stream-begin", { game });
            } else if (game !== this.lastGame) {
              this.twitchChannel.emit("stream-change-game", { game });
            }
            this.lastGame = game;
          }
        } catch (err) {
          this.twitchChannel.emit("error", err);
        }
      });
      this.twitchChannel.emit("info", "subscribed to webhooks");
    } catch (err) {
      this.twitchChannel.emit("error", err);
    }
  }

  private async getGameName(gameId: string) {
    const game = await this.twitchClient.helix.games.getGameById(gameId);
    // in some cases, twitch doesnt find the game
    return game ? game.name : "";
  }

  private getCallbackProperties() {
    const urlRegex = this.options.callback_url.match(
      /^(https?):\/\/([^/:]*)(:[0-9]+)?(\/.*)?$/
    );
    if (!urlRegex) {
      throw new Error(`Invalid callback url: ${this.options.callback_url}`);
    }
    const ssl = urlRegex[1] === "https";
    const hostName = urlRegex[2];
    const port = urlRegex[3]
      ? parseInt(urlRegex[3].substring(1), 10)
      : undefined;
    const pathPrefix = urlRegex[4] === "/" ? undefined : urlRegex[4];
    const behindProxy = ssl || pathPrefix || port !== this.options.port;
    const reverseProxy = behindProxy
      ? {
          ssl,
          pathPrefix,
          port: port ? port : ssl ? 443 : 80
        }
      : undefined;
    return {
      port: this.options.port,
      hostName,
      reverseProxy
    };
  }
}
