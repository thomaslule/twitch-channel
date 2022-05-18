export function getWithDefault(config: MandatoryConfig): Config {
  return { ...config };
}

/**
 * @category Config
 */
export type Config = MandatoryConfig & Partial<OptionalConfig>;

/**
 * @category Config
 */
export interface MandatoryConfig {
  /**
   * The channel you want to observe
   */
  channel: string;
  /**
   * Get it by registering a twitch app [here](https://dev.twitch.tv/dashboard/apps/create) (Redirect URI is not used)
   */
  clientId: string;
  /**
   * Secret of your registered twitch app
   */
  clientSecret: string;
}

/**
 * @category Config
 */
export interface OptionalConfig {
  /**
   * Twitch bot login.
   *
   * If not provided, there will be no bot connected to IRC and some events wont be emitted (see {@link TwitchChannel}).
   */
  botName: string;
  /**
   * Create your token [here](https://twitchapps.com/tmi/).
   *
   * If not provided, there will be no bot connected to IRC and some events wont be emitted (see {@link TwitchChannel}).
   */
  botToken: string;
  /**
   * URL to your server, reachable from the internet.
   *
   * If not provided, there will be no EventSub subscriptions and some events wont be emitted (see {@link TwitchChannel}).
   */
  callbackUrl: string;
  /**
   * When {@link callbackUrl} and {@link port} are provided, the lib will start an http server that will listen to this port for incoming EventSub requests.
   *
   * If port is not provided, the lib wont start a server. See the EventSub paragraph in {@link TwitchChannel}.
   */
  port: number;

  secret: string;
}
