import { EventType } from "../Events.types";

export interface Producer {
  name: string;
  produceEvents(type: EventType): Promise<boolean>;
}
