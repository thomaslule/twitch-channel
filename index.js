const { EventEmitter } = require('events');
const { promisify } = require('util');
const kraken = require('twitch-api-v5');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');

const defaultOptions = {
  channel: null,
  username: null,
  token: null,
  client_id: null,
  client_secret: null,
  activate_webhook: true,
  callback_url: 'http://localhost/',
  secret: false,
  port: 80,
  logger: console,
};

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();

  const webhook = opts.activate_webhook
    ? Webhook(bus, opts)
    : null;

  const chatBot = ChatBot(bus, opts);

  const on = (event, handler) => bus.on(event, handler);

  const connect = async () => {
    try {
      await chatBot.connect();
    } catch (err) {
      opts.logger.error('could not connect chatbot', err);
    }
    try {
      if (opts.activate_webhook) {
        await webhook.start();
      }
    } catch (err) {
      opts.logger.error('could not start webhook', err);
    }
  };

  const disconnect = async () => {
    if (opts.activate_webhook) {
      try {
        await webhook.stop();
      } catch (err) {
        opts.logger.error('could not stop webhook', err);
      }
    }
    try {
      await chatBot.disconnect();
    } catch (err) {
      opts.logger.error('could not disconnect chatbot', err);
    }
  };

  const { say } = chatBot;

  async function getTopClipper() {
    kraken.clientID = opts.client_id;
    const krakenTopClips = promisify(kraken.clips.top);

    const res = await krakenTopClips({ channel: opts.channel, period: 'week', limit: 1 });
    return res.clips.length > 0
      ? res.clips[0].curator.name
      : null;
  }

  return {
    on, connect, disconnect, say, getTopClipper,
  };
};
