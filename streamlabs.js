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

  async function eventHandler(event) {
    try {
      if (event.message[0].isTest) {
        return;
      }
      if (event.type === 'donation') {
        const { from, amount } = event.message[0];
        const viewer = await helix.getTwitchUserByName(normalizeHandle(from));
        if (viewer) {
          bus.emit('donation', { viewer, amount });
        } else {
          opts.logger.error(`donation received from ${from} but couldnt retrieve twitch user`);
        }
      } else if (event.type === 'host') {
        const { name, viewers } = event.message[0];
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
  }

  function start() {
    socket = io(`https://sockets.streamlabs.com?token=${opts.streamlabs_socket_token}`);
    socket.on('event', eventHandler);
    opts.logger.info('listening to streamlabs events');
  }

  function stop() {
    socket.close();
  }

  return { start, stop };
};
