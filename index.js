const { EventEmitter } = require('events');
const { promisify } = require('util');
const kraken = require('twitch-api-v5');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');
const Streamlabs = require('./streamlabs');

const defaultOptions = {
  channel: null,
  username: null,
  token: null,
  client_id: null,
  client_secret: null,
  streamlabs_socket_token: null,
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

  const streamlabs = Streamlabs(bus, opts);

  const on = (event, handler) => bus.on(event, handler);

  const connect = async () => {
    try {
      streamlabs.start();
      await chatBot.connect();
      if (opts.activate_webhook) {
        await webhook.start();
      }
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const disconnect = async () => {
    try {
      streamlabs.stop();
      await chatBot.disconnect();
      if (opts.activate_webhook) {
        await webhook.stop();
      }
    } catch (err) {
      opts.logger.error(err);
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
