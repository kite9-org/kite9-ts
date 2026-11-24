/** Ids accepted by `e2e/boot.ts` via `?behaviours=`. */
export const E2E_BEHAVIOUR_IDS = [
  "selectable",
  "actionable",
  "styleable",
  "resizable",
] as const;

export type E2eBehaviourId = (typeof E2E_BEHAVIOUR_IDS)[number];

export function isE2eBehaviourId(id: string): id is E2eBehaviourId {
  return (E2E_BEHAVIOUR_IDS as readonly string[]).includes(id);
}
