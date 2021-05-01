import { ApiClient } from "twitch";
import { ClientCredentialsAuthProvider } from "twitch-auth";
import { Config } from "./Config";
import { log } from "./log";
import { TwitchChannel } from "./TwitchChannel";
import { TwitchWebhook, WebhookSubscription } from "./TwitchWebhook";

export class Webhook {
  private activated: boolean;
  private config!: WebhookConfig;
  private webhook!: TwitchWebhook;
  private lastGame: string | undefined;
  private followSubscription?: WebhookSubscription;
  private streamSubscription?: WebhookSubscription;

  constructor(
    private twitchChannel: TwitchChannel,
    config: Config,
    private apiClient: ApiClient,
    authProvider: ClientCredentialsAuthProvider
  ) {
    this.activated = config.callback_url !== undefined;
    if (this.activated) {
      this.config = config as WebhookConfig;
      this.webhook = new TwitchWebhook(
        this.twitchChannel,
        this.config,
        authProvider
      );
    }
  }

  public async start() {
    if (this.activated) {
      const stream = await this.apiClient.helix.streams.getStreamByUserName(
        this.config.channel
      );
      this.lastGame = stream
        ? await this.getGameName(stream.gameId)
        : undefined;
      this.webhook.listen();
      await this.subscribe();
    }
  }

  public async stop() {
    if (this.activated && this.webhook) {
      this.webhook.close();
      await this.followSubscription!.stop();
      await this.streamSubscription!.stop();
    }
  }

  private async subscribe() {
    try {
      const channel = await this.apiClient.helix.users.getUserByName(
        this.config.channel
      );
      if (!channel) {
        throw new Error(`channel ${this.config.channel} not found`);
      }
      this.followSubscription = await this.webhook!.subscribeToFollowsToUser(
        channel.id,
        (follow) => {
          try {
            const viewerId = follow.from_id;
            const viewerName = follow.from_name;
            this.twitchChannel.emit("follow", { viewerId, viewerName });
          } catch (error) {
            log.error(
              this.twitchChannel,
              "an error happened during a follow event",
              error
            );
          }
        }
      );
      await this.webhook!.subscribeToStreamChanges(
        channel.id,
        async (stream) => {
          try {
            if (!stream) {
              if (this.lastGame !== undefined) {
                this.twitchChannel.emit("stream-end", {});
                this.lastGame = undefined;
              }
            } else {
              const game = await this.getGameName(stream.game_id);
              if (this.lastGame === undefined) {
                this.twitchChannel.emit("stream-begin", { game });
              } else if (game !== this.lastGame) {
                this.twitchChannel.emit("stream-change-game", { game });
              }
              this.lastGame = game;
            }
          } catch (error) {
            log.error(
              this.twitchChannel,
              "an error happened during a stream change event",
              error
            );
          }
        }
      );
      log.info(this.twitchChannel, "subscribed to webhooks");
    } catch (error) {
      log.error(
        this.twitchChannel,
        "an error happened during the webhook subscription",
        error
      );
    }
  }

  private async getGameName(gameId: string) {
    const game = await this.apiClient.helix.games.getGameById(gameId);
    // in some cases, twitch doesnt find the game
    return game ? game.name : "";
  }
}

interface WebhookConfig extends Config {
  callback_url: string;
}
