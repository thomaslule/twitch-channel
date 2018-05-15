const poll = require('./poll');

module.exports = (helix, bus, opts) => {
  // get current broadcasted game or null if not broadcasting
  const fetchBroadcast = async () => {
    try {
      const stream = await helix.getStreamInfoByUsername(opts.channel);
      let game = null;
      if (stream) {
        const gameData = await helix.sendHelixRequest(`games?id=${stream.game_id}`);
        game = gameData[0].name;
      }
      opts.logger.info(`polled current broadcasted game: ${game}`);
      return game;
    } catch (err) {
      opts.logger.error('could not fetch current broadcast', err);
      return null;
    }
  };

  const onBroadcastChange = (currentGame, previousGame) => {
    if (previousGame && currentGame) bus.emit('stream-change-game', currentGame);
    else if (currentGame) bus.emit('stream-begin', currentGame);
    else bus.emit('stream-end');
  };

  return poll(fetchBroadcast, onBroadcastChange, {
    auto_start: false,
    logger: opts.logger,
  });
};
