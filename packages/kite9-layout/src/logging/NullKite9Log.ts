import type { Kite9Log } from "./Kite9Log.js";

/** A log that discards everything (useful default for tests / when logging is off). */
export class NullKite9Log implements Kite9Log {
  go(): boolean {
    return false;
  }
  send(..._args: unknown[]): void {}
  error(..._args: unknown[]): void {}
}
