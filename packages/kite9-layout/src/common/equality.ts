/**
 * Helpers emulating Kotlin/Java `equals` / `hashCode` semantics, where `==` calls `equals()`.
 */

export interface Equatable {
  equals(other: unknown): boolean;
  hashCode?(): number;
}

function isEquatable(x: unknown): x is Equatable {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { equals?: unknown }).equals === "function"
  );
}

/** Kotlin `a == b`. */
export function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (isEquatable(a)) return a.equals(b);
  return false;
}

/** Java `String.hashCode()`. */
export function stringHashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Best-effort Java `Object.hashCode()` for primitives, strings and objects exposing hashCode(). */
export function valueHashCode(x: unknown): number {
  if (x == null) return 0;
  if (typeof x === "string") return stringHashCode(x);
  if (typeof x === "number") return x | 0;
  if (typeof x === "boolean") return x ? 1231 : 1237;
  if (typeof x === "object" && typeof (x as Equatable).hashCode === "function") {
    return (x as Equatable).hashCode!();
  }
  return 0;
}
