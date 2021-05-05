export function getWithDefault(config: MandatoryConfig): Config {
  return { ...config };
}

export type Config = MandatoryConfig & Partial<OptionalConfig>;

export interface MandatoryConfig {
  channel: string;
  client_id: string;
  client_secret: string;
}

export interface OptionalConfig {
  bot_name: string;
  bot_token: string;
  callback_url: string;
  port: number;
}
