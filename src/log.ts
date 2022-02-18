import { TwitchEventEmitter } from "./TwitchChannel";

export const log = {
  debug(eventEmitter: TwitchEventEmitter, message: string) {
    eventEmitter.emit({
      type: "log",
      level: "debug",
      message,
    });
  },

  info(eventEmitter: TwitchEventEmitter, message: string) {
    eventEmitter.emit({
      type: "log",
      level: "info",
      message,
    });
  },

  warn(eventEmitter: TwitchEventEmitter, message: string) {
    eventEmitter.emit({
      type: "log",
      level: "warn",
      message,
    });
  },

  error(eventEmitter: TwitchEventEmitter, message: string, error?: unknown) {
    eventEmitter.emit({
      type: "log",
      level: "error",
      message,
      error,
    });
  },
};
