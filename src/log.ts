import { EventEmitter } from "events";

export const log = {
  debug(eventEmitter: EventEmitter, message: string) {
    eventEmitter.emit("log", {
      level: "debug",
      message,
    });
  },

  info(eventEmitter: EventEmitter, message: string) {
    eventEmitter.emit("log", {
      level: "info",
      message,
    });
  },

  warn(eventEmitter: EventEmitter, message: string) {
    eventEmitter.emit("log", {
      level: "warn",
      message,
    });
  },

  error(eventEmitter: EventEmitter, message: string, error: unknown) {
    eventEmitter.emit("log", {
      level: "error",
      message,
      error,
    });
  },
};
