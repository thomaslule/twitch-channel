const { EventEmitter } = require('events');
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
    const now = new Date();
    const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const channel = await helix.getTwitchUserByName(opts.channel);
    const res = await helix.sendHelixRequest(`clips?broadcaster_id=${channel.id}&started_at=${lastWeek.toISOString()}&ended_at=${now.toISOString()}&first=1`);
    return res.length > 0 ? res[0].creator_id : undefined;
  }

  return {
    on, connect, disconnect, say, getTwitchUserByName, getTopClipper,
  };
};
