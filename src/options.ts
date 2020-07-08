const defaultOptions = {
  port: 80,
  is_test: false,
  streamlabs_socket_token: undefined,
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
  callback_url: string;
}

export interface Options extends MandatoryOptions {
  port: number;
  is_test: boolean;
  streamlabs_socket_token?: string;
}
