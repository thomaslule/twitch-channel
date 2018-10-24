const { EventEmitter } = require('events');
const { promisify } = require('util');
const kraken = require('twitch-api-v5');
const TwitchHelix = require('twitch-helix');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');
const Streamlabs = require('./streamlabs');

const defaultOptions = {
  logger: console,
  port: 80,
  is_test: false,
  error_handler: (err) => { throw err; },
};

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();
  const webhook = Webhook(bus, opts);
  const chatBot = ChatBot(bus, opts);
  const streamlabs = Streamlabs(bus, opts);
  const helix = new TwitchHelix({ clientId: opts.client_id, clientSecret: opts.client_secret });

  const on = (event, handler) => {
    bus.on(event, async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        opts.error_handler(err);
      }
    });
  };

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

  async function getTwitchUserByName(name) {
    const login = name
      .normalize('NFD') // split accented characters : è => e`
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/[^a-z0-9_]/g, '');
    return helix.getTwitchUserByName(login);
  }

  async function getTopClipper() {
    kraken.clientID = opts.client_id;
    const krakenTopClips = promisify(kraken.clips.top);

    const res = await krakenTopClips({ channel: opts.channel, period: 'week', limit: 1 });
    return res.clips.length > 0
      ? res.clips[0].curator
      : null;
  }

  return {
    on, connect, disconnect, say, getTwitchUserByName, getTopClipper,
  };
};
