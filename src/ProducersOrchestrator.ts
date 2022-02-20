import { EventType } from "./Events.types";
import { log } from "./log";
import { Producer } from "./producers/Producer.types";
import { TwitchEventEmitter } from "./TwitchChannel";

export class ProducersOrchestrator {
  private eventStates: EventState[] = eventsTypes.map((eventType) => ({
    eventType,
    produced: false,
  }));

  constructor(
    private producers: Producer[],
    private emitter: TwitchEventEmitter
  ) {}

  public async subscribeProducers() {
    for (const producer of this.producers) {
      const notProduced = this.eventStates.filter((state) => !state.produced);
      for (const state of notProduced) {
        state.produced = await producer.produceEvents(state.eventType);
        if (state.produced) {
          log.info(
            this.emitter,
            `Ready to produce events ${state.eventType} thanks to ${producer.name}`
          );
        }
      }
    }
  }
}

const eventsTypes: EventType[] = [
  "ban",
  "chat",
  "cheer",
  "clear-chat",
  "emotes-only",
  "follow",
  "followers-only",
  "host",
  "hosting",
  "hype-train-begin",
  "hype-train-end",
  "message-deleted",
  "raid",
  "reward-redeem",
  "slow-mode",
  "stream-begin",
  "stream-change-game",
  "stream-change-title",
  "stream-end",
  "sub",
  "sub-gift",
  "sub-gift-received",
  "subs-only",
  "timeout",
];

interface EventState {
  eventType: EventType;
  produced: boolean;
}
