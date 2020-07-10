import { Client } from "tmi.js";
import { Config } from "./config";
import { getTwitchUserByName } from "./get-twitch-user-by-name";
import { log } from "./log";
import { TwitchChannel } from "./twitch-channel";

export class BroadcasterChatBot {
  private activated: boolean;
  private config!: BroadcasterChatBotConfig;
  private bot!: Client;

  constructor(private twitchChannel: TwitchChannel, config: Config) {
    this.activated = config.broadcaster_bot_token !== undefined;
    if (this.activated) {
      this.config = config as BroadcasterChatBotConfig;
      this.bot = Client({
        connection: {
          secure: true,
          reconnect: true,
        },
        identity: {
          username: this.config.channel,
          password: this.config.broadcaster_bot_token,
        },
        channels: [this.config.channel],
        logger: {
          info: (message) => {
            log.debug(twitchChannel, `IRC broadcaster bot: ${message}`);
          },
          warn: (message) => {
            log.warn(twitchChannel, `IRC broadcaster bot: ${message}`);
          },
          error: (message) => {
            log.error(twitchChannel, `IRC broadcaster bot: ${message}`);
          },
        },
      });

      this.bot.on("hosted", async (channel, username, viewers, autohost) => {
        try {
          const viewer = await getTwitchUserByName(this.config, username);
          if (!viewer) {
            throw new Error(
              `host: couldnt get the twitch viewer named ${username}`
            );
          }
          const viewerId = viewer.id;
          const viewerName = viewer.displayName;
          twitchChannel.emit("host", {
            viewerId,
            viewerName,
            viewers,
            autohost,
          });
        } catch (error) {
          log.error(
            twitchChannel,
            "an error happened during a host event",
            error
          );
        }
      });
    }
  }

  public async connect() {
    if (
      this.activated &&
      this.bot.readyState() !== "CONNECTING" &&
      this.bot.readyState() !== "OPEN"
    ) {
      await this.bot.connect();
      log.info(
        this.twitchChannel,
        "connected to the IRC chat with the broadcaster account"
      );
    }
  }

  public async disconnect() {
    if (
      this.activated &&
      this.bot.readyState() !== "CLOSING" &&
      this.bot.readyState() !== "CLOSED"
    ) {
      await this.bot.disconnect();
    }
  }
}

interface BroadcasterChatBotConfig extends Config {
  broadcaster_bot_token: string;
}
