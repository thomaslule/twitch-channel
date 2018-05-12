const { EventEmitter } = require('events');
const TwitchHelix = require('twitch-helix');
const kraken = require('twitch-api-v5');
const tmi = require('tmi.js');
const { promisify } = require('util');
const poll = require('./poll');

const defaultOptions = {
  channel: null,
  username: null,
  token: null,
  poll: true,
  clientId: null,
  clientSecret: null,
  logger: console,
};

const tmiEvents = ['action', 'ban', 'chat', 'cheer', 'clearchat', 'connected', 'connecting', 'disconnected', 'emoteonly', 'emotesets', 'followersonly', 'hosted', 'hosting', 'join', 'logon', 'message', 'mod', 'mods', 'notice', 'part', 'ping', 'pong', 'r9kbeta', 'reconnect', 'resub', 'roomstate', 'serverchange', 'slowmode', 'subscribers', 'subscription', 'timeout', 'unhost', 'unmod', 'whisper'];

module.exports = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const bus = new EventEmitter();

  // get current broadcasted game or null if not broadcasting
  const fetchBroadcast = async () => {
    try {
      const helix = new TwitchHelix({
        clientId: opts.clientId,
        clientSecret: opts.clientSecret,
      });
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
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const say = (message) => {
    user.say(`#${opts.channel}`, message);
  };

  return {
    on, connect, disconnect, say,
  };
};
