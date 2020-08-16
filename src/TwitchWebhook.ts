import axios from "axios";
import { json } from "body-parser";
import { createHmac, randomBytes } from "crypto";
import * as express from "express";
import { Server } from "http";
import * as morgan from "morgan";
import TwitchClient from "twitch";

export class TwitchWebhook {
  private twitchClient: TwitchClient;
  private app: express.Application;
  private server?: Server;

  constructor(private config: WebhookConfig) {
    this.twitchClient = TwitchClient.withClientCredentials(
      this.config.client_id,
      this.config.client_secret
    );
    this.app = express();
    this.app.use(morgan("tiny"));
    this.app.use(
      json({
        verify: (req: RequestWithRaw, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
  }

  public async listen() {
    await new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, resolve);
    });
  }

  public async unlisten() {
    await new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  public async subscribeToFollowsToUser(
    channelId: string,
    callback: (followEvent: WebhookFollowEvent) => void
  ): Promise<WebhookSubscription> {
    return this.subscribeTo(
      `users/follows?first=1&to_id=${channelId}`,
      `users/follows/${channelId}`,
      callback
    );
  }

  public async subscribeToStreamChanges(
    channelId: string,
    callback: (streamChangeEvent: WebhookStreamChangeEvent) => void
  ): Promise<WebhookSubscription> {
    return this.subscribeTo(
      `streams?user_id=${channelId}`,
      `streams/${channelId}`,
      callback
    );
  }

  private async subscribeTo<TEvent>(
    topic: string,
    callbackPath: string,
    callback: (event: TEvent) => void
  ) {
    const subscription = { active: true };
    const secret = randomBytes(20).toString("hex");
    try {
      this.registerMiddleware(callbackPath, callback, subscription, secret);
      await this.sendSubscriptionRequest(
        "subscribe",
        callbackPath,
        topic,
        secret
      );
      const stop = async () => {
        subscription.active = false;
        await this.sendSubscriptionRequest(
          "unsubscribe",
          callbackPath,
          topic,
          secret
        );
      };
      return { stop };
    } catch (err) {
      subscription.active = false;
      throw err;
    }
  }

  private async registerMiddleware<TEvent>(
    callbackPath: string,
    callback: (event: TEvent) => void,
    subscription: { active: boolean },
    secret: string
  ) {
    this.app.get(`/${callbackPath}`, (req, res, next) => {
      if (subscription.active) {
        res.send(req.query["hub.challenge"]).end();
      } else {
        next();
      }
    });
    this.app.post(`/${callbackPath}`, (req, res, next) => {
      if (
        subscription.active &&
        this.verifySignature(
          req.get("X-Hub-Signature")!,
          secret,
          (req as RequestWithRaw).rawBody
        )
      ) {
        res.sendStatus(200);
        callback(req.body.data[0]);
      } else {
        next();
      }
    });
  }

  private async sendSubscriptionRequest(
    mode: "subscribe" | "unsubscribe",
    callbackPath: string,
    topic: string,
    secret: string
  ) {
    const token = await this.twitchClient.getAccessToken();
    await axios.post(
      "https://api.twitch.tv/helix/webhooks/hub",
      {
        "hub.callback": `${this.config.callback_url}/${callbackPath}`,
        "hub.mode": mode,
        "hub.topic": `https://api.twitch.tv/helix/${topic}`,
        "hub.lease_seconds": 600,
        "hub.secret": secret,
      },
      {
        headers: {
          Authorization: `Bearer ${token!.accessToken}`,
          "Client-Id": this.config.client_id,
        },
      }
    );
  }

  private verifySignature(
    hubSignatureHeader: string,
    secret: string,
    body: Buffer
  ) {
    const [algorithm, signature] = hubSignatureHeader.split("=", 2);
    const hash = createHmac(algorithm, secret).update(body).digest("hex");
    return hash === signature;
  }
}

export interface WebhookConfig {
  client_id: string;
  client_secret: string;
  port: number;
  callback_url: string;
}

export interface WebhookFollowEvent {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  followed_at: string;
}

export type WebhookStreamChangeEvent =
  | {
      id: string;
      user_id: string;
      user_name: string;
      game_id: string;
      community_ids: unknown[];
      type: string;
      title: string;
      viewer_count: number;
      started_at: string;
      language: string;
      thumbnail_url: string;
    }
  | undefined;

export interface WebhookSubscription {
  stop(): Promise<void>;
}

type RequestWithRaw = express.Request & { rawBody: Buffer };
