const { EventEmitter } = require('events');
const TwitchHelix = require('twitch-helix');
const ChatBot = require('./chat-bot');
const Webhook = require('./webhook');
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

  const pollTopClipper = PollTopClipper(bus, opts);

  const webhook = opts.activate_webhook
    ? Webhook(helix, bus, opts)
    : null;

  const chatBot = ChatBot(bus, opts);

  const on = (event, handler) => bus.on(event, handler);

  const connect = async () => {
    if (opts.activate_polling) {
      pollTopClipper.start();
    }
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
    if (opts.activate_polling) {
      pollTopClipper.stop();
    }
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

  return {
    on, connect, disconnect, say,
  };
};
