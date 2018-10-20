const { EventEmitter } = require('events');
const { promisify } = require('util');
const kraken = require('twitch-api-v5');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');
const Streamlabs = require('./streamlabs');

const defaultOptions = {
  logger: console,
};

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();
  const webhook = Webhook(bus, opts);
  const chatBot = ChatBot(bus, opts);
  const streamlabs = Streamlabs(bus, opts);

  const on = (event, handler) => bus.on(event, handler);

  async function connect() {
    try {
      streamlabs.start();
      await chatBot.connect();
      await webhook.start();
    } catch (err) {
      opts.logger.error(err);
    }
  }

  async function disconnect() {
    try {
      streamlabs.stop();
      await chatBot.disconnect();
      await webhook.stop();
    } catch (err) {
      opts.logger.error(err);
    }
  }

  function say(message) {
    chatBot.say(message);
  }

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
