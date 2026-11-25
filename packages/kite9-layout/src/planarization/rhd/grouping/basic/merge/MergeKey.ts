import type { Group } from "../group/Group.js";

/**
 * A merge option is keyed on the two groups it merges.
 *
 * Kotlin data-class equality is by group identity; {@link key} provides an equivalent
 * value key for use in a JS `Map` (group numbers are unique).
 */
export class MergeKey {
  constructor(
    readonly a: Group,
    readonly b: Group,
  ) {}

  get key(): string {
    return `${this.a.groupNumber},${this.b.groupNumber}`;
  }

  equals(other: unknown): boolean {
    return other instanceof MergeKey && other.a === this.a && other.b === this.b;
  }

  hashCode(): number {
    return (this.a.hashCode() * 31 + this.b.hashCode()) | 0;
  }

  toString(): string {
    return "[MK: " + this.a + " (" + this.a.size + ")  " + this.b + "(" + this.b.size + ")]";
  }
}
