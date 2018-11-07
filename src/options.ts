const defaultOptions = {
  port: 80,
  is_test: false,
};

export function getWithDefault(options: MandatoryOptions): Options {
  return { ...defaultOptions, ...options };
}

export interface MandatoryOptions {
  channel: string;
  bot_name: string;
  bot_token: string;
  client_id: string;
  client_secret: string;
  streamlabs_socket_token: string;
  callback_url: string;
  secret: string;
}

export interface Options extends MandatoryOptions {
  port: number;
  is_test: boolean;
}
