const io = require('socket.io-client');
// const TwitchHelix = require('twitch-helix');

// const normalizeHandle = str => str
//   .normalize('NFD') // split accented characters : è => e`
//   .toLowerCase()
//   .replace(/ /g, '_')
//   .replace(/[^a-z0-9_]/g, '');

module.exports = (bus, opts) => {
  let socket;

  function eventHandler(event) {
    try {
      if (!opts.is_test && event.message[0].isTest) {
        return;
      }
      if (event.type === 'donation') {
        bus.emit('donation', event.message[0]);
      } else if (event.type === 'host') {
        bus.emit('host', event.message[0]);
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
