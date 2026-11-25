import { LogicException } from "./LogicException.js";
import type { Logable } from "./Logable.js";

export enum Destination {
  OFF = "OFF",
  STREAM = "STREAM",
  FILE = "FILE",
}

export interface Kite9Log {
  go(): boolean;
  send(string: string | null | undefined): void;
  send(indent: number, string: string | null | undefined): void;
  send(prefix: string | null | undefined, items: Iterable<unknown>): void;
  send(prefix: string | null | undefined, items: ReadonlyMap<unknown, unknown>): void;
  error(string: string | null | undefined): void;
  error(string: string | null | undefined, e: unknown): void;
}

/** Kotlin `Kite9Log.Companion`: pluggable factory for log instances. */
export const Kite9LogFactory: {
  factory: ((l: Logable) => Kite9Log) | null;
  instance(l: Logable): Kite9Log;
} = {
  factory: null,
  instance(l: Logable): Kite9Log {
    if (Kite9LogFactory.factory == null) {
      throw new LogicException("Kite9Log.factory has not been set");
    }
    return Kite9LogFactory.factory(l);
  },
};

/** Convenience: same as `Kite9Log.instance(l)` in Kotlin. */
export function kite9Log(l: Logable): Kite9Log {
  return Kite9LogFactory.instance(l);
}
