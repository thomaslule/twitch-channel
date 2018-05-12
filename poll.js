const defaultOptions = {
  interval: 5 * 60 * 1000,
  auto_start: true,
};

module.exports = (func, onChange, options = {}) => {
  const opts = { ...defaultOptions, ...options };
  let value;
  let intervalId;

  const poll = async () => {
    const newValue = await func();
    if (newValue !== value) {
      onChange(newValue, value);
    }
    value = newValue;
  };

  const start = () => {
    intervalId = setInterval(poll, opts.interval);
    poll();
  };

  const stop = () => {
    clearInterval(intervalId);
  };

  if (opts.auto_start) {
    start();
  }

  return { start, stop };
};
