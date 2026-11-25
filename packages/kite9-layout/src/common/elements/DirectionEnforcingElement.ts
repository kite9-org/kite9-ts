/**
 * Marker interface for items that are added to the planarization to ensure that the
 * orthogonalization will ensure a certain direction in the final diagram.
 *
 * Kotlin uses `is DirectionEnforcingElement`; in TS implementors set the brand and callers use
 * {@link isDirectionEnforcingElement}.
 */
export interface DirectionEnforcingElement {
  readonly isDirectionEnforcingElement: true;
}

export function isDirectionEnforcingElement(
  x: unknown,
): x is DirectionEnforcingElement {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as { isDirectionEnforcingElement?: unknown }).isDirectionEnforcingElement ===
      true
  );
}
