import type { LongFraction } from "@kite9/model";
import { LogicException } from "../../logging/LogicException.js";
import type { Bounds } from "./Bounds.js";

export class BasicBounds implements Bounds {
  static readonly EMPTY_BOUNDS: BasicBounds = new BasicBounds(-1.0, -1.0);

  constructor(
    readonly distanceMin: number,
    readonly distanceMax: number,
  ) {
    if (distanceMin === -1.0 && distanceMax === -1.0) {
      // empty bounds, fine
    } else if (distanceMin < 0 || distanceMin > 1) {
      throw new LogicException("Illegal Bounds");
    } else if (distanceMax < 0 || distanceMax > 1) {
      throw new LogicException("Illegal Bounds");
    } else if (distanceMin > distanceMax) {
      throw new LogicException("Illegal Bounds");
    }
  }

  expand(other: Bounds): Bounds {
    if (this === BasicBounds.EMPTY_BOUNDS) {
      return other;
    } else if (other === BasicBounds.EMPTY_BOUNDS) {
      return this;
    }
    const o2 = other as BasicBounds;
    return new BasicBounds(
      Math.min(o2.distanceMin, this.distanceMin),
      Math.max(o2.distanceMax, this.distanceMax),
    );
  }

  narrow(other: Bounds): Bounds;
  narrow(trim: number): Bounds;
  narrow(arg: Bounds | number): Bounds {
    if (typeof arg === "number") {
      return new BasicBounds(this.distanceMin + arg, this.distanceMax - arg);
    }
    const other = arg;
    if (this === BasicBounds.EMPTY_BOUNDS) {
      return this;
    } else if (other === BasicBounds.EMPTY_BOUNDS) {
      return other;
    }
    const o2 = other as BasicBounds;
    const lower = Math.max(o2.distanceMin, this.distanceMin);
    const upper = Math.min(o2.distanceMax, this.distanceMax);
    return lower >= upper ? BasicBounds.EMPTY_BOUNDS : new BasicBounds(lower, upper);
  }

  get distanceCenter(): number {
    return (this.distanceMax + this.distanceMin) / 2.0;
  }

  /**
   * As well as following the usual -1, 0, 1 compare operation, this also returns the common level
   * of the two bounds being compared.
   */
  compareTo(other: Bounds): number {
    if (this.distanceMax < other.distanceMin) {
      return -1;
    } else if (this.distanceMin > other.distanceMax) {
      return 1;
    } else {
      return 0;
    }
  }

  keep(buffer: number, width: number, atFraction: LongFraction | number): Bounds {
    if (typeof atFraction === "number") {
      const span = Math.max(
        this.distanceMax - this.distanceMin - buffer * 2.0,
        0.0,
      );
      const pos = atFraction * span;
      let lower = this.distanceMin + pos - width / 2.0 + buffer;
      let upper = this.distanceMin + pos + width / 2.0 + buffer;
      lower = Math.min(Math.max(this.distanceMin + buffer, lower), upper);
      upper = Math.max(Math.min(this.distanceMax - buffer, upper), lower);
      return new BasicBounds(lower, upper);
    }
    const span = this.distanceMax - this.distanceMin - buffer * 2.0;
    const pos = (atFraction.numerator / atFraction.denominator) * span;
    let lower = this.distanceMin + pos - width / 2.0 + buffer;
    let upper = this.distanceMin + pos + width / 2.0 + buffer;
    lower = Math.max(this.distanceMin + buffer, lower);
    upper = Math.min(this.distanceMax - buffer, upper);
    return new BasicBounds(lower, upper);
  }

  size(): number {
    return this.distanceMax - this.distanceMin;
  }

  /** Kotlin data-class equality. */
  equals(other: unknown): boolean {
    return (
      other instanceof BasicBounds &&
      other.distanceMin === this.distanceMin &&
      other.distanceMax === this.distanceMax
    );
  }

  hashCode(): number {
    return (hashDouble(this.distanceMin) * 31 + hashDouble(this.distanceMax)) | 0;
  }

  toString(): string {
    return `(bb, g=${kotlinDouble(this.distanceMin)} - ${kotlinDouble(this.distanceMax)})`;
  }
}

function kotlinDouble(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

function hashDouble(n: number): number {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, n);
  return buf.getInt32(0) ^ buf.getInt32(4);
}
