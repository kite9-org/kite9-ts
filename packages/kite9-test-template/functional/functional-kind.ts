/** Functional test suite kinds (layout packages + `@kite9/grid`). */

export const FUNCTIONAL_KINDS = [
  "display",
  "layout",
  "thorough",
  "performance",
  "grid",
] as const;

export type FunctionalKind = (typeof FUNCTIONAL_KINDS)[number];

export function isFunctionalKind(s: string): s is FunctionalKind {
  return (FUNCTIONAL_KINDS as readonly string[]).includes(s);
}
