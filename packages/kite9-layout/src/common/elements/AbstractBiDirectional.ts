import type { BiDirectional, Direction } from "@kite9/model";
import { reverseDirection } from "@kite9/model";
import { LogicException } from "../../logging/LogicException.js";
import { stringHashCode, valueEquals } from "../equality.js";

function isBiDirectional<X>(v: unknown): v is BiDirectional<X> {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as BiDirectional<X>).getFrom === "function" &&
    typeof (v as BiDirectional<X>).getTo === "function"
  );
}

export abstract class AbstractBiDirectional<X> implements BiDirectional<X> {
  abstract getID(): string;
  abstract getFrom(): X;
  abstract getTo(): X;
  abstract getDrawDirection(): Direction | null;

  toString(): string {
    return "[" + String(this.getFrom()) + "-" + String(this.getTo()) + "]";
  }

  otherEnd(end: X): X {
    if (end === this.getFrom()) return this.getTo();
    if (end === this.getTo()) return this.getFrom();
    throw new LogicException(`This is not an end: ${String(end)} of ${this}`);
  }

  /** Handles both Kotlin overloads: meets(BiDirectional) and meets(X). */
  meets(e: BiDirectional<X> | X | null): boolean {
    if (isBiDirectional<X>(e)) {
      return (
        valueEquals(this.getFrom(), e.getTo()) ||
        valueEquals(this.getFrom(), e.getFrom()) ||
        valueEquals(this.getTo(), e.getTo()) ||
        valueEquals(this.getTo(), e.getFrom())
      );
    }
    if (e == null) {
      throw new LogicException("meets(null)");
    }
    return valueEquals(this.getFrom(), e) || valueEquals(this.getTo(), e);
  }

  getDrawDirectionFrom(from: X): Direction | null {
    const dd = this.getDrawDirection();
    if (dd == null) return null;
    if (valueEquals(from, this.getFrom())) {
      return dd;
    }
    if (valueEquals(from, this.getTo())) {
      return reverseDirection(dd);
    }
    throw new Error(
      `Trying to get direction from an end that's not set: ${String(from)} in ${this}`,
    );
  }

  hashCode(): number {
    return stringHashCode(this.getID());
  }
}
