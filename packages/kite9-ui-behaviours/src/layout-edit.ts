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
 * Grow light-DOM ancestor rectangulars so a nested content resize isn't
 * clipped. Uses the current parent−child box delta as chrome padding.
 * Call with the child's *content* size only — not occupied (content+margin),
 * or pad compounds with prior track growth and sizes run away.
 */
export function growAncestorsToFit(
  ctx: BehaviourContext,
  host: Element,
  childW: number,
  childH: number,
): void {
  const session = requireLayoutSession(ctx, "growAncestorsToFit");
  let ancestor: Element | null = host.parentElement;
  while (ancestor && ancestor !== ctx.root) {
    const aid = ancestor.getAttribute("id");
    if (aid && session.layout.placements[aid]) {
      const parentBox = ancestor.getBoundingClientRect();
      const childBox = host.getBoundingClientRect();
      const padW = Math.max(0, parentBox.width - childBox.width);
      const padH = Math.max(0, parentBox.height - childBox.height);
      session.layout.growToFit(aid, {
        w: childW + padW,
        h: childH + padH,
      });
    }
    ancestor = ancestor.parentElement;
  }
}

/** Mutate placement size, grow ancestors if needed, re-apply layout. */
export function applySizeToLayout(
  ctx: BehaviourContext,
  id: string,
  size: Size,
  host?: Element | null,
): void {
  const session = requireLayoutSession(ctx, "applySizeToLayout");
  const el =
    host ?? ctx.root.querySelector(`#${CSS.escape(id)}`);
  if (el) growAncestorsToFit(ctx, el, size.w, size.h);
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
