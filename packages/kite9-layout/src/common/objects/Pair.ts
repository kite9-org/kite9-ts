import { valueEquals, valueHashCode } from "../equality.js";

/** Unordered pair: (a,b) equals (b,a). */
export class Pair<X> {
  constructor(
    readonly a: X,
    readonly b: X,
  ) {}

  equals(other: unknown): boolean {
    if (other instanceof Pair) {
      return (
        (this.safeEquals(other.a, this.a) && this.safeEquals(other.b, this.b)) ||
        (this.safeEquals(other.b, this.a) && this.safeEquals(other.a, this.b))
      );
    }
    return false;
  }

  private safeEquals(a2: unknown, a3: unknown): boolean {
    if (a2 === a3) {
      return true;
    }
    if (a2 == null || a3 == null) {
      return false;
    }
    return this.elementEquals(a2, a3);
  }

  elementEquals(a2: unknown, a3: unknown): boolean {
    return valueEquals(a2, a3);
  }

  hashCode(): number {
    return (valueHashCode(this.a) + valueHashCode(this.b)) | 0;
  }

  toString(): string {
    return `[${String(this.a)},${String(this.b)}]`;
  }
}
