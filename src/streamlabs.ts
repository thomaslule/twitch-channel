import * as io from "socket.io-client";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class Streamlabs {
  private socket: SocketIOClient.Socket | undefined;

  constructor(private twitchChannel: TwitchChannel, private options: Options) {
  }

  public start() {
    this.stop();
    this.socket = io(`https://sockets.streamlabs.com?token=${this.options.streamlabs_socket_token}`);
    this.socket.on("event", (event: any) => this.eventHandler(event));
    this.twitchChannel.emit("info", "listening to streamlabs events");
  }

  public stop() {
    if (this.socket !== undefined) {
      this.socket.close();
    }
  }

  private async eventHandler(event: any) {
    try {
      if (!this.options.is_test && event.message[0].isTest) {
        return;
      }
      if (event.type === "donation") {
        const { amount, currency, message, from } = event.message[0];
        const viewer = await this.twitchChannel.getTwitchUserByName(from);
        if (viewer) {
          const viewerId = viewer.id;
          const viewerName = viewer.display_name;
          this.twitchChannel.emit("donation", { viewerId, viewerName, amount, currency, message });
        } else {
          this.twitchChannel.emit("error", `donation: couldnt get the twitch viewer named ${from}`);
        }
      } else if (event.type === "host") {
        const { name, viewers } = event.message[0];
        const viewer = await this.twitchChannel.getTwitchUserByName(name);
        if (viewer) {
          const viewerId = viewer.id;
          const viewerName = viewer.display_name;
          this.twitchChannel.emit("host", { viewerId, viewerName, viewers });
        } else {
          this.twitchChannel.emit("error", `host: couldnt get the twitch viewer named ${name}`);
        }
      }
    } catch (err) {
      this.twitchChannel.emit("error", err);
    }
  }
}