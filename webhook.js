const TwitchWebhook = require('twitch-webhook');

const REFRESH_EVERY = 864000;

module.exports = (helix, bus, opts) => {
  const webhook = new TwitchWebhook({
    client_id: opts.client_id,
    callback: opts.callback_url,
    secret: opts.secret,
    lease_seconds: REFRESH_EVERY,
    listen: {
      autoStart: false,
    },
  });
  let intervalId;
  let lastGame;

  async function getGameName(gameId) {
    return (await helix.sendHelixRequest(`games?id=${gameId}`))[0].name;
  }

  webhook.on('users/follows', ({ event }) => {
    event.data.forEach(async (follow) => {
      try {
        const follower = await helix.getTwitchUserById(follow.from_id);
        bus.emit('follow', follower.login);
      } catch (err) {
        opts.logger.error('could not fetch follower login', err);
      }
    });
  });

  webhook.on('streams', async ({ event }) => {
    try {
      if (event.data.length === 0) {
        if (lastGame !== null) {
          bus.emit('stream-end');
          lastGame = null;
        }
      } else {
        const game = await getGameName(event.data[0].game_id);
        if (lastGame === null) {
          bus.emit('stream-begin', game);
        } else if (game !== lastGame) {
          bus.emit('stream-change-game', game);
        }
        lastGame = game;
      }
    } catch (err) {
      opts.logger.error('could not handle stream change', err);
    }
  });

  const subscribe = async () => {
    try {
      const channel = await helix.getTwitchUserByName(opts.channel);
      await webhook.subscribe('users/follows', { first: 1, to_id: channel.id });
      await webhook.subscribe('streams', { user_id: channel.id });
      opts.logger.info('subscribed to webhooks');
    } catch (err) {
      opts.logger.error('could not subscribe to webhooks', err);
    }
  };

  const start = async () => {
    const stream = await helix.getStreamInfoByUsername(opts.channel);
    lastGame = stream
      ? await getGameName(stream.game_id)
      : null;
    await webhook.listen(opts.port);
    await subscribe();
    intervalId = setInterval(subscribe, REFRESH_EVERY * 1000);
  };

  const stop = async () => {
    await webhook.unsubscribe('*');
    opts.logger.info('unsubscribed from webhooks');
    await webhook.close();
    clearInterval(intervalId);
  };

  return { start, stop };
};
