const kraken = require('twitch-api-v5');
const { promisify } = require('util');
const poll = require('./poll');

module.exports = (bus, opts) => {
  const fetchTopClipper = async () => {
    try {
      // do this each time because kraken may be used elsewhere
      kraken.clientID = opts.client_id;
      const krakenTopClips = promisify(kraken.clips.top);

      const res = await krakenTopClips({ channel: opts.channel, period: 'week', limit: 1 });
      let topClipper = null;
      if (res.clips.length > 0) {
        topClipper = res.clips[0].curator.name;
      }
      opts.logger.info(`polled current top clipper: ${topClipper}`);
      return topClipper;
    } catch (err) {
      opts.logger.error('could not fetch current top clipper', err);
      return null;
    }
  };

  const onTopClipperChange = (topClipper) => {
    if (topClipper !== null) {
      bus.emit('top-clipper-change', topClipper);
    }
  };

  return poll(fetchTopClipper, onTopClipperChange, {
    auto_start: false,
    interval: 60 * 60 * 1000,
    logger: opts.logger,
  });
};
