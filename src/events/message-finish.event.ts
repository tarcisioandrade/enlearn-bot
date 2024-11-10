import { EventEmitter } from "events";

export class MessageFinishEvent {
  private event = new EventEmitter();

  on(listener: (...args: any[]) => void) {
    this.event.on("finish", listener);
  }

  emit() {
    this.event.emit("finish");
  }
}
