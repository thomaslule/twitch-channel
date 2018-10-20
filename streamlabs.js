const io = require('socket.io-client');
const TwitchHelix = require('twitch-helix');

const normalizeHandle = str => str
  .normalize('NFD') // split accented characters : è => e`
  .toLowerCase()
  .replace(/ /g, '_')
  .replace(/[^a-z0-9_]/g, '');

module.exports = (bus, opts) => {
  let socket;
  const helix = new TwitchHelix({ clientId: opts.client_id, clientSecret: opts.client_secret });

  function start() {
    if (opts.streamlabs_socket_token) {
      socket = io(`https://sockets.streamlabs.com?token=${opts.streamlabs_socket_token}`);
      socket.on('event', async (data) => {
        try {
          if (data.type === 'donation' && !data.message[0].isTest) {
            const { from, amount } = data.message[0];
            const viewer = await helix.getTwitchUserByName(normalizeHandle(from));
            if (viewer) {
              bus.emit('donation', { viewer, amount });
            } else {
              opts.logger.error(`donation received from ${from} but couldnt retrieve twitch user`);
            }
          }
          if (data.type === 'host' && !data.message[0].isTest) {
            const { name, viewers } = data.message[0];
            const viewer = await helix.getTwitchUserByName(normalizeHandle(name));
            if (viewer) {
              bus.emit('host', { viewer, viewers });
            } else {
              opts.logger.error(`host received from ${name} but couldnt retrieve twitch user`);
            }
          }
        } catch (err) {
          opts.logger.error(err);
        }
      });
      opts.logger.info('listening to streamlabs donations');
    }
  }

  function stop() {
    if (socket) {
      socket.close();
    }
  }

  return { start, stop };
};
