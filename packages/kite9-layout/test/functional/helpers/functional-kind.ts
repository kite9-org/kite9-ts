/** Functional test suite kind — mirrors Java display / layout / thorough / performance. */

export const FUNCTIONAL_KINDS = [
  "display",
  "layout",
  "thorough",
  "performance",
] as const;

export type FunctionalKind = (typeof FUNCTIONAL_KINDS)[number];

export function isFunctionalKind(s: string): s is FunctionalKind {
  return (FUNCTIONAL_KINDS as readonly string[]).includes(s);
}
