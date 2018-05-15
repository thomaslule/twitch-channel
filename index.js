const { EventEmitter } = require('events');
const TwitchHelix = require('twitch-helix');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');
const PollBroadcast = require('./poll-broadcast');
const PollTopClipper = require('./poll-top-clipper');

const defaultOptions = {
  channel: null,
  username: null,
  token: null,
  client_id: null,
  client_secret: null,
  activate_polling: true,
  activate_webhook: true,
  callback_url: 'http://localhost/',
  secret: false,
  port: 80,
  logger: console,
};

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();

  const helix = opts.activate_polling || opts.activate_webhook
    ? new TwitchHelix({ clientId: opts.client_id, clientSecret: opts.client_secret })
    : null;

  const pollBroadcast = PollBroadcast(helix, bus, opts);

  const pollTopClipper = PollTopClipper(bus, opts);

  const webhook = opts.activate_webhook
    ? Webhook(helix, bus, opts)
    : null;

  const chatBot = ChatBot(bus, opts);

  const on = (event, handler) => bus.on(event, handler);

  const connect = async () => {
    if (opts.activate_polling) {
      pollBroadcast.start();
      pollTopClipper.start();
    }
    try {
      await chatBot.connect();
    } catch (err) {
      opts.logger.error(err);
    }
    try {
      if (opts.activate_webhook) {
        await webhook.start();
      }
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const disconnect = async () => {
    if (opts.activate_polling) {
      pollBroadcast.stop();
      pollTopClipper.stop();
    }
    if (opts.activate_webhook) {
      try {
        await webhook.stop();
      } catch (err) {
        opts.logger.error(err);
      }
    }
    try {
      await chatBot.disconnect();
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const { say } = chatBot;

  return {
    on, connect, disconnect, say,
  };
};
