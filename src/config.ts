const defaultConfig = {
  port: 80,
  is_test: false,
  streamlabs_socket_token: undefined,
};

export function getWithDefault(config: MandatoryConfig): Config {
  return { ...defaultConfig, ...config };
}

export interface MandatoryConfig {
  channel: string;
  bot_name: string;
  bot_token: string;
  client_id: string;
  client_secret: string;
  callback_url: string;
}

export interface Config extends MandatoryConfig {
  port: number;
  is_test: boolean;
  streamlabs_socket_token?: string;
}
