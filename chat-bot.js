const tmi = require('twitch-js');

const tmiEvents = ['action', 'ban', 'chat', 'cheer', 'clearchat', 'connected', 'connecting', 'disconnected', 'emoteonly', 'emotesets', 'followersonly', 'hosted', 'hosting', 'join', 'logon', 'message', 'mod', 'mods', 'notice', 'part', 'ping', 'pong', 'r9kbeta', 'raid', 'reconnect', 'resub', 'ritual', 'roomstate', 'serverchange', 'slowmode', 'subgift', 'subscribers', 'subscription', 'timeout', 'unhost', 'unmod', 'whisper'];

module.exports = (bus, opts) => {
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

  const connect = async () => {
    if (user.readyState() !== 'CONNECTING' && user.readyState() !== 'OPEN') {
      await user.connect();
    }
  };

  const disconnect = async () => {
    if (user.readyState() !== 'CLOSING' && user.readyState() !== 'CLOSED') {
      await user.disconnect();
    }
  };

  const say = (message) => {
    user.say(`#${opts.channel}`, message);
  };

  return { connect, disconnect, say };
};
