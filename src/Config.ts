const defaultConfig = {
  port: 80,
};

export function getWithDefault(config: MandatoryConfig): Config {
  return { ...defaultConfig, ...config };
}

export interface Config extends MandatoryConfig, Partial<OptionalConfig> {
  port: number;
}

export interface MandatoryConfig {
  channel: string;
  client_id: string;
  client_secret: string;
}

export interface OptionalConfig {
  bot_name: string;
  bot_token: string;
  broadcaster_bot_token: string;
  callback_url: string;
  port: number;
}
