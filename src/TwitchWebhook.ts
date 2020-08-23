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
  private subscriptions: Subscription[] = [];

  constructor(private config: WebhookConfig) {
    this.twitchClient = TwitchClient.withClientCredentials(
      this.config.client_id,
      this.config.client_secret
    );
    this.app = this.setupExpress();
    this.app.get("/:id", (...args) => this.getMiddleware(...args));
    this.app.post("/:id", (...args) => this.postMiddleware(...args));
  }

  public async listen() {
    await new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, resolve);
    });
  }

  public async close() {
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  public async subscribeToFollowsToUser(
    channelId: string,
    callback: (followEvent: WebhookFollowEvent) => void
  ): Promise<WebhookSubscription> {
    return this.subscribeTo(
      `users/follows?first=1&to_id=${channelId}`,
      callback
    );
  }

  public async subscribeToStreamChanges(
    channelId: string,
    callback: (streamChangeEvent: WebhookStreamChangeEvent) => void
  ): Promise<WebhookSubscription> {
    return this.subscribeTo(`streams?user_id=${channelId}`, callback);
  }

  private setupExpress() {
    const app = express();
    app.use(morgan("tiny"));
    app.use(
      json({
        verify: (req: RequestWithRaw, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    return app;
  }

  private getMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const subscription = this.getSubscription(req.params.id);
    if (!subscription) {
      return next();
    }
    res.send(req.query["hub.challenge"]).end();
  }

  private postMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const subscription = this.getSubscription(req.params.id);
    if (!subscription) {
      return next();
    }
    if (!this.verifySignature(req as RequestWithRaw, subscription.secret)) {
      return next();
    }
    res.sendStatus(200);
    subscription.callback(req.body.data[0]);
  }

  private async subscribeTo<TEvent>(
    topic: string,
    callback: (event: TEvent) => void
  ) {
    const id = randomBytes(20).toString("hex");
    const secret = randomBytes(20).toString("hex");
    const subscription: Subscription = { id, topic, secret, callback };
    this.addSubscription(subscription);
    try {
      await this.sendSubscriptionRequest("subscribe", subscription);
    } catch (err) {
      this.removeSubscription(id);
      throw err;
    }
    return { stop: this.createStopSubscriptionFunction(subscription) };
  }

  private createStopSubscriptionFunction(subscription: Subscription) {
    return async () => {
      this.removeSubscription(subscription.id);
      await this.sendSubscriptionRequest("unsubscribe", subscription);
    };
  }

  private async sendSubscriptionRequest(
    mode: "subscribe" | "unsubscribe",
    subscription: Subscription
  ) {
    const token = await this.twitchClient.getAccessToken();
    await axios.post(
      "https://api.twitch.tv/helix/webhooks/hub",
      {
        "hub.callback": `${this.config.callback_url}/${subscription.id}`,
        "hub.mode": mode,
        "hub.topic": `https://api.twitch.tv/helix/${subscription.topic}`,
        "hub.lease_seconds": 600,
        "hub.secret": subscription.secret,
      },
      {
        headers: {
          Authorization: `Bearer ${token!.accessToken}`,
          "Client-Id": this.config.client_id,
        },
      }
    );
  }

  private verifySignature(req: RequestWithRaw, secret: string) {
    const xHubSignature = req.get("X-Hub-Signature");
    if (!xHubSignature) {
      return false;
    }
    const [algorithm, signature] = xHubSignature.split("=", 2);
    const hash = createHmac(algorithm, secret)
      .update(req.rawBody)
      .digest("hex");
    return hash === signature;
  }

  private addSubscription(subscription: Subscription) {
    this.subscriptions.push(subscription);
  }

  private getSubscription(id: string) {
    return this.subscriptions.find((sub) => sub.id === id);
  }

  private removeSubscription(id: string) {
    this.subscriptions = this.subscriptions.filter((sub) => sub.id !== id);
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

interface Subscription {
  id: string;
  topic: string;
  secret: string;
  callback: (event: any) => void;
}
