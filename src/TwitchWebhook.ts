import axios from "axios";
import { json } from "body-parser";
import { createHmac, randomBytes } from "crypto";
import * as express from "express";
import { Server } from "http";
import { ClientCredentialsAuthProvider } from "twitch-auth";
import { log } from "./log";
import { TwitchChannel } from "./TwitchChannel";

const LEASE_SECONDS = 600;

export class TwitchWebhook {
  private router: express.Router;
  private server?: Server;
  private subscriptions: Subscription[] = [];

  constructor(
    private twitchChannel: TwitchChannel,
    private config: WebhookConfig,
    private authProvider: ClientCredentialsAuthProvider
  ) {
    this.router = this.setupExpress();
    this.router.get("/:id", (...args) => this.getGETMiddleware(...args));
    this.router.post("/:id", (...args) => this.getPOSTMiddleware(...args));
  }

  public getMiddleware() {
    return this.router as express.RequestHandler;
  }

  public async listen() {
    await new Promise((resolve, reject) => {
      if (!this.config.port) {
        reject(new Error("Cannot listen, port not provided"));
      }
      const app = express();
      app.use(this.router);
      this.server = app.listen(this.config.port!, resolve);
    });
  }

  public async close() {
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve(undefined);
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
      `users_follows_${channelId}`,
      callback
    );
  }

  public async subscribeToStreamChanges(
    channelId: string,
    callback: (streamChangeEvent: WebhookStreamChangeEvent) => void
  ): Promise<WebhookSubscription> {
    return this.subscribeTo(
      `streams?user_id=${channelId}`,
      `streams_${channelId}`,
      callback
    );
  }

  private setupExpress() {
    const app = express.Router();
    app.use((req, res, next) => {
      res.on("finish", () => {
        log.debug(
          this.twitchChannel,
          `Received request on webhook endpoint: ${req.method} ${req.originalUrl} - ${res.statusCode}`
        );
      });
      next();
    });
    app.use(
      json({
        verify: (req: RequestWithRaw, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    return app;
  }

  private getGETMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const subscription = this.getSubscription(req.params.id);
    if (!subscription) {
      log.debug(
        this.twitchChannel,
        `Received a GET for an unknown subscription: ${req.params.id}`
      );
      return next();
    }
    if (req.query["hub.mode"] === "denied") {
      log.error(
        this.twitchChannel,
        `Webhook subscription ${subscription.id} denied: ${req.query["hub.reason"]}`
      );
      return res.sendStatus(200);
    }
    res.send(req.query["hub.challenge"]).end();
  }

  private getPOSTMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const subscription = this.getSubscription(req.params.id);
    if (!subscription) {
      log.debug(
        this.twitchChannel,
        `Received a POST for an unknown subscription: ${req.params.id}`
      );
      return next();
    }
    if (!this.verifySignature(req as RequestWithRaw, subscription.secret)) {
      log.debug(
        this.twitchChannel,
        `Received a POST with an invalid signature for subscription ${req.params.id}`
      );
      return next();
    }
    res.sendStatus(200);
    subscription.callback(req.body.data[0]);
  }

  private async subscribeTo<TEvent>(
    topic: string,
    id: string,
    callback: (event: TEvent) => void
  ) {
    const secret = randomBytes(20).toString("hex");
    const refreshId = setTimeout(() => {
      this.removeSubscription(id);
      this.subscribeTo(topic, id, callback).catch((err) => {
        log.error(
          this.twitchChannel,
          `Could not renew webhook subscription on topic ${topic}`,
          err
        );
      });
    }, LEASE_SECONDS * 1000);
    const subscription: Subscription = {
      id,
      topic,
      secret,
      callback,
      refreshId,
    };
    this.addSubscription(subscription);
    try {
      await this.sendSubscriptionRequest("subscribe", subscription);
    } catch (err) {
      clearTimeout(refreshId);
      this.removeSubscription(id);
      throw err;
    }
    return { stop: this.createStopSubscriptionFunction(subscription) };
  }

  private createStopSubscriptionFunction(subscription: Subscription) {
    return async () => {
      clearTimeout(subscription.refreshId);
      this.removeSubscription(subscription.id);
      await this.sendSubscriptionRequest("unsubscribe", subscription);
    };
  }

  private async sendSubscriptionRequest(
    mode: "subscribe" | "unsubscribe",
    subscription: Subscription
  ) {
    const token = await this.authProvider.getAccessToken();
    await axios.post(
      "https://api.twitch.tv/helix/webhooks/hub",
      {
        "hub.callback": `${this.config.callback_url}/${subscription.id}`,
        "hub.mode": mode,
        "hub.topic": `https://api.twitch.tv/helix/${subscription.topic}`,
        "hub.lease_seconds": LEASE_SECONDS,
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
  callback_url: string;
  port?: number;
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
  refreshId: NodeJS.Timeout;
}
