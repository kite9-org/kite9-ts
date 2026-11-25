import type { OPair } from "@kite9/model";
import { LogicException } from "../../logging/LogicException.js";
import { valueEquals, valueHashCode } from "../equality.js";

/**
 * Pair, where values are ordered.  I.e. a tuple of length 2.
 * Implements the `OPair` interface from `@kite9/model` and adds the Kotlin helper methods.
 */
export class BasicOPair<X> implements OPair<X> {
  constructor(
    readonly a: X,
    readonly b: X,
  ) {}

  oneOf(item: X): boolean {
    return this.a === item || this.b === item;
  }

  otherOne(item: unknown): X | null {
    if (this.a === item) {
      return this.b;
    } else if (this.b === item) {
      return this.a;
    } else {
      throw new LogicException();
    }
  }

  equals(other: unknown): boolean {
    return (
      other instanceof BasicOPair &&
      valueEquals(this.a, other.a) &&
      valueEquals(this.b, other.b)
    );
  }

  hashCode(): number {
    return (valueHashCode(this.a) * 31 + valueHashCode(this.b)) | 0;
  }

  toString(): string {
    return `OPair(a=${String(this.a)}, b=${String(this.b)})`;
  }
}
