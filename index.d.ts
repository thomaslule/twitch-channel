export = TwitchChannel;

declare function TwitchChannel(options: TwitchChannel.TwitchChannelOptions): TwitchChannel.TwitchChannelInstance;

declare namespace TwitchChannel {

  export interface TwitchChannelInstance {
    on(event: string, handler: (...args: any[]) => void): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    say(message: string): void;
    getTwitchUserByName(name: string): Promise<any>;
    getTopClipper(): Promise<string | undefined>;
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
    is_test?: boolean;
  }

}
