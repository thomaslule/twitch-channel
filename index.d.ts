export = TwitchChannel;

declare function TwitchChannel(options: TwitchChannel.TwitchChannelOptions): TwitchChannel.TwitchChannelInstance;

declare namespace TwitchChannel {

  export interface TwitchChannelInstance {
    on(event: string, handler: (...args: any[]) => void): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    say(message: string): void;
    getTopClipper(): Promise<any>;
  }

  export interface TwitchChannelOptions {
    channel: string;
    bot_name: string;
    bot_token: string;
    client_id: string;
    client_secret: string;
    streamlabs_socket_token: string;
    callback_url: string;
    secret: string;
    port?: number;
    logger: any;
    error_handler: (err: any) => void;
    is_test?: boolean;
  }

}
