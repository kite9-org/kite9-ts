import type { IntegerRange } from "@kite9/model";

export type { IntegerRange };

/**
 * Kotlin `IntegerRange.notSet(r)`: a null range is *not* treated as unset (returns false).
 * (Note: `integerRangeNotSet` in `@kite9/model` treats null as unset.)
 */
export function notSet(r: IntegerRange | null | undefined): boolean {
  return r != null ? r.from > r.to : false;
}
