const defaultConfig = {
  port: 80,
  is_test: false,
};

export function getWithDefault(config: MandatoryConfig): Config {
  return { ...defaultConfig, ...config };
}

export interface Config extends MandatoryConfig, Partial<OptionalConfig> {
  port: number;
  is_test: boolean;
}

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
  is_test: boolean;
  streamlabs_socket_token: string;
}
