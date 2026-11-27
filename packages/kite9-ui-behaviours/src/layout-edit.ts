import type { BoxInsets, Size } from "@kite9/model";
import type { BehaviourContext } from "@kite9/ui";

function requireLayoutSession(ctx: BehaviourContext, who: string) {
  const session = ctx.layout;
  if (!session) {
    throw new Error(
      `${who} requires BehaviourContext.layout (AdjustableLayout session)`,
    );
  }
  return session;
}

/**
 * Previously grew ancestor placements from painted parent−child chrome so a
 * nested resize wasn't clipped. On a flattened shared grid that double-counts:
 * the leaf resize already expands the same tracks, and multi-span ancestors
 * distribute extra into padding tracks that never shrink — the diagram runs
 * away. Containers stretch to their cell, so ancestor size is unnecessary.
 */
export function growAncestorsToFit(
  _ctx: BehaviourContext,
  _host: Element,
  _childW: number,
  _childH: number,
): void {
  // Intentionally a no-op for flattened LayoutData (see applySizeToLayout).
}

/** Mutate placement size and re-apply layout. */
export function applySizeToLayout(
  ctx: BehaviourContext,
  id: string,
  size: Size,
  _host?: Element | null,
): void {
  const session = requireLayoutSession(ctx, "applySizeToLayout");
  if (!session.layout.resizeElement(id, size)) {
    throw new Error(`No cell placement in layout for #${id}`);
  }
  session.apply();
}

/**
 * Record placement margins on `AdjustableLayout` and recompute occupied tracks.
 * Used live while dragging margin arrows (preview) and again on OK.
 * Style persistence is separate — `ReplaceStyle` only on OK.
 */
export function applyMarginsToLayout(
  ctx: BehaviourContext,
  id: string,
  margin: BoxInsets,
): void {
  const session = requireLayoutSession(ctx, "applyMarginsToLayout");
  if (!session.layout.setMargin(id, margin)) {
    throw new Error(`No cell placement in layout for #${id}`);
  }
  session.apply();
}
