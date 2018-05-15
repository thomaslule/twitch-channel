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

  const subscribe = async () => {
    try {
      const channel = await helix.getTwitchUserByName(opts.channel);
      await webhook.subscribe('users/follows', { first: 1, to_id: channel.id });
      opts.logger.info('subscribed to follow webhook');
    } catch (err) {
      opts.logger.error('could not subscribe to follow webhook', err);
    }
  };

  const start = async () => {
    await webhook.listen(opts.port);
    await subscribe();
    intervalId = setInterval(subscribe, REFRESH_EVERY * 1000);
  };

  const stop = async () => {
    await webhook.unsubscribe('*');
    opts.logger.info('unsubscribed from follow webhook');
    await webhook.close();
    clearInterval(intervalId);
  };

  return { start, stop };
};
