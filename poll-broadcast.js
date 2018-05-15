const poll = require('./poll');

module.exports = (helix, bus, opts) => {
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

  return poll(fetchBroadcast, onBroadcastChange, { auto_start: false });
};
