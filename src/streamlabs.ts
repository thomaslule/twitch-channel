import * as io from "socket.io-client";
import { Options } from "./options";
import { TwitchChannel } from "./twitch-channel";

export class Streamlabs {
  private socket: SocketIOClient.Socket;
  private handledMessages = new Set<string>();

  constructor(private twitchChannel: TwitchChannel, private options: Options) {
    this.socket = io(`https://sockets.streamlabs.com?token=${this.options.streamlabs_socket_token}`, {
      autoConnect: false,
    });
    this.socket.on("event", (event: any) => this.eventHandler(event));
  }

  public start() {
    this.socket.open();
    this.twitchChannel.emit("info", "listening to streamlabs events");
  }

  public stop() {
    this.socket.close();
  }

  private async eventHandler(event: any) {
    try {
      this.twitchChannel.emit("debug", `streamlabs event: ${JSON.stringify(event)}`);
      if (!Array.isArray(event.message)) { return; }
      await Promise.all(event.message.map(async (streamlabsMsg: any) => {
        if (!this.options.is_test && streamlabsMsg.isTest) {
          return;
        }
        if (this.isDuplicateMessage(streamlabsMsg)) {
          return;
        }
        if (event.type === "donation") {
          const { amount, currency, message, from } = streamlabsMsg;
          const viewer = await this.twitchChannel.getTwitchUserByName(from);
          if (viewer) {
            const viewerId = viewer.id;
            const viewerName = viewer.display_name;
            this.twitchChannel.emit("streamlabs/donation", { viewerId, viewerName, amount, currency, message });
          } else {
            const viewerName = from;
            this.twitchChannel.emit("streamlabs/donation", { viewerName, amount, currency, message });
          }
        } else if (event.type === "host") {
          const { name, viewers } = streamlabsMsg;
          const viewer = await this.twitchChannel.getTwitchUserByName(name);
          if (viewer) {
            const viewerId = viewer.id;
            const viewerName = viewer.display_name;
            this.twitchChannel.emit("host", { viewerId, viewerName, viewers });
          } else {
            this.twitchChannel.emit("error", `host: couldnt get the twitch viewer named ${name}`);
          }
        }
      }));

    } catch (err) {
      this.twitchChannel.emit("error", err);
    }
  }

  // Streamlabs messages are often sent twice. To avoid that, remember them for 1mn
  private isDuplicateMessage(message: any) {
    if (message._id) {
      if (this.handledMessages.has(message._id)) {
        return true;
      }
      this.handledMessages.add(message._id);
      setTimeout(() => { this.handledMessages.delete(message._id); }, 60000);
    }
    return false;
  }
}
