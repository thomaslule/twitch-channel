const { EventEmitter } = require('events');
const TwitchHelix = require('twitch-helix');
const kraken = require('twitch-api-v5');
const tmi = require('tmi.js');
const TwitchWebhook = require('twitch-webhook');
const { promisify } = require('util');
const poll = require('./poll');

const defaultOptions = {
  channel: null,
  username: null,
  token: null,
  poll: true,
  clientId: null,
  clientSecret: null,
  webhook: true,
  callback: 'http://localhost/',
  secret: false,
  refreshWebhookEvery: 864000,
  port: 80,
  logger: console,
};

const tmiEvents = ['action', 'ban', 'chat', 'cheer', 'clearchat', 'connected', 'connecting', 'disconnected', 'emoteonly', 'emotesets', 'followersonly', 'hosted', 'hosting', 'join', 'logon', 'message', 'mod', 'mods', 'notice', 'part', 'ping', 'pong', 'r9kbeta', 'reconnect', 'resub', 'roomstate', 'serverchange', 'slowmode', 'subscribers', 'subscription', 'timeout', 'unhost', 'unmod', 'whisper'];

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();
  const helix = new TwitchHelix({
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  });
  let intervalId;
  const webhook = new TwitchWebhook({
    client_id: opts.clientId,
    callback: opts.callback,
    secret: opts.secret,
    lease_seconds: opts.refreshWebhookEvery,
    listen: {
      port: opts.port,
      autoStart: false,
    },
  });
  webhook.on('users/follows', ({ event }) => {
    event.data.forEach(async (follow) => {
      try {
        const follower = await helix.getTwitchUserById(follow.from_id);
        bus.emit('follow', follower.login);
      } catch (err) {
        opts.logger.error(err);
      }
    });
  });

  // get current broadcasted game or null if not broadcasting
  const fetchBroadcast = async () => {
    try {
      const stream = await helix.getStreamInfoByUsername(opts.channel);
      if (stream) {
        const game = await helix.sendHelixRequest(`games?id=${stream.game_id}`);
        return game[0].name;
      }
      return null;
    } catch (err) {
      opts.logger.error(err);
      return null;
    }
  };

  const onBroadcastChange = (currentGame, previousGame) => {
    if (previousGame && currentGame) bus.emit('stream-change-game', currentGame);
    else if (currentGame) bus.emit('stream-begin', currentGame);
    else bus.emit('stream-end');
  };

  const pollBroadcast = poll(fetchBroadcast, onBroadcastChange, {
    auto_start: false,
  });

  const fetchTopClipper = async () => {
    try {
      kraken.clientID = opts.clientId;
      const krakenTopClips = promisify(kraken.clips.top);
      const res = await krakenTopClips({ channel: opts.channel, period: 'week', limit: 1 });
      if (res.clips.length > 0) {
        return res.clips[0].curator.name;
      }
      return null;
    } catch (err) {
      opts.logger.error(err);
      return null;
    }
  };

  const onTopClipperChange = (topClipper) => {
    if (topClipper !== null) {
      bus.emit('top-clipper-change', topClipper);
    }
  };

  const pollTopClipper = poll(fetchTopClipper, onTopClipperChange, {
    auto_start: false,
    interval: 60 * 60 * 1000,
    logger: opts.logger,
  });

  const TmiClient = tmi.client;
  const user = new TmiClient({
    options: { debug: false },
    connection: { reconnect: true },
    identity: {
      username: opts.username,
      password: opts.token,
    },
    channels: [`#${opts.channel}`],
  });
  tmiEvents.forEach((event) => {
    user.on(event, (...args) => bus.emit(event, ...args));
  });

  const webhookSubscribe = async () => {
    try {
      const channel = await helix.getTwitchUserByName(opts.channel);
      await webhook.subscribe('users/follows', { first: 1, to_id: channel.id });
      opts.logger.info('subscribed to follow webhook');
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const on = (event, handler) => bus.on(event, handler);

  const connect = async () => {
    try {
      if (user.readyState() !== 'CONNECTING' && user.readyState() !== 'OPEN') {
        await user.connect();
      }
      if (opts.poll) {
        pollBroadcast.start();
        pollTopClipper.start();
      }
      if (opts.webhook) {
        await webhook.listen(opts.port);
        await webhookSubscribe();
        intervalId = setInterval(webhookSubscribe, opts.refreshWebhookEvery * 1000);
      }
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const disconnect = async () => {
    try {
      if (user.readyState() !== 'CLOSING' && user.readyState() !== 'CLOSED') {
        await user.disconnect();
      }
      if (opts.poll) {
        pollBroadcast.stop();
        pollTopClipper.stop();
      }
      if (opts.webhook) {
        await webhook.unsubscribe('*');
        await webhook.close();
        clearInterval(intervalId);
      }
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const say = (message) => {
    user.say(`#${opts.channel}`, message);
  };

  process.on('SIGINT', () => {
    opts.logger.info(`disconnecting from channel ${opts.channel}`);
    disconnect();
  });

  return {
    on, connect, disconnect, say,
  };
};
