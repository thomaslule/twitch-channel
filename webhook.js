const TwitchWebhook = require('twitch-webhook');

module.exports = (helix, bus, opts) => {
  const webhook = new TwitchWebhook({
    client_id: opts.clientId,
    callback: opts.callback,
    secret: opts.secret,
    lease_seconds: opts.refreshWebhookEvery,
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
        opts.logger.error(err);
      }
    });
  });

  const subscribe = async () => {
    try {
      const channel = await helix.getTwitchUserByName(opts.channel);
      await webhook.subscribe('users/follows', { first: 1, to_id: channel.id });
      opts.logger.info('subscribed to follow webhook');
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const start = async () => {
    await webhook.listen(opts.port);
    await subscribe();
    intervalId = setInterval(subscribe, opts.refreshWebhookEvery * 1000);
  };

  const stop = async () => {
    await webhook.unsubscribe('*');
    await webhook.close();
    clearInterval(intervalId);
  };

  return { start, stop };
};
