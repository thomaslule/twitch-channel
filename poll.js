const defaultOptions = {
  interval: 5 * 60 * 1000,
  auto_start: true,
  logger: console,
};

module.exports = (func, onChange, options = {}) => {
  const opts = { ...defaultOptions, ...options };
  let value;
  let intervalId;

  const poll = async () => {
    try {
      const newValue = await func();
      if (newValue !== value) {
        onChange(newValue, value);
      }
      value = newValue;
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const start = async () => {
    try {
      intervalId = setInterval(poll, opts.interval);
      value = await func();
    } catch (err) {
      opts.logger.error(err);
    }
  };

  const stop = () => {
    clearInterval(intervalId);
  };

  if (opts.auto_start) {
    start();
  }

  return { start, stop };
};
