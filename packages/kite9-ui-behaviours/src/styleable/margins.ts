import { ReplaceStyle } from "@kite9/command";
import type { BoxInsets } from "@kite9/model";
import type { BehaviourContext, ContextMenu, Overlay } from "@kite9/ui";
import {
  getElementDiagramBBox,
  hasAffordance,
  isRectangular,
  type ContextMenuCallback,
} from "@kite9/ui";
import { applyMarginsToLayout } from "../layout-edit.js";

function readCssPx(el: Element, name: string, fallback = 0): number {
  const raw =
    (el as HTMLElement).style.getPropertyValue(name) ||
    getComputedStyle(el).getPropertyValue(name);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Standard CSS margin longhands — light-DOM hosts use the browser box model. */
const MARGIN_PROPS = [
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
] as const;

type MarginProp = (typeof MARGIN_PROPS)[number];

export const marginsIconUrl = new URL(
  "../../icons/margins.svg",
  import.meta.url,
).href;

function lastSizedRectangular(root: Element): Element | null {
  const candidates = [
    root.querySelector(".lastSelected"),
    ...Array.from(root.querySelectorAll(".selected")),
  ].filter((el): el is Element => el != null);

  for (const el of candidates) {
    if (
      el.getAttribute("id") &&
      isRectangular(el) &&
      hasAffordance(el, "size")
    ) {
      return el;
    }
  }
  return null;
}

function pendingToInsets(pending: Record<MarginProp, number>): BoxInsets {
  return {
    top: Math.round(pending["margin-top"]),
    right: Math.round(pending["margin-right"]),
    bottom: Math.round(pending["margin-bottom"]),
    left: Math.round(pending["margin-left"]),
  };
}

function replaceStyle(
  ctx: BehaviourContext,
  id: string,
  el: Element,
  name: string,
  to: string | null,
): void {
  const from = ctx.command.getStyleValue(el, name);
  if (from === to || (from == null && to == null)) return;
  if ((from == null || from === "") && (to == null || to === "")) return;
  const cmd = new ReplaceStyle();
  cmd.fragmentId = id;
  cmd.name = name;
  cmd.from = from;
  cmd.to = to;
  cmd.apply(ctx.command);
}

/**
 * Styles-submenu item: Margins → overlay arrows + OK/Cancel.
 * Drag updates `AdjustableLayout` (tracks) live; `ReplaceStyle` only on OK.
 */
export function createMarginsStyleCallback(
  ctx: BehaviourContext,
  overlay: Overlay,
): ContextMenuCallback {
  return (event, cm) => {
    const selected = lastSizedRectangular(ctx.root);
    if (!selected) return;

    cm.addControl(
      event,
      marginsIconUrl,
      "Margins",
      () => openMarginsEditor(ctx, overlay, cm, event, selected),
      "Style",
    );
  };
}

function openMarginsEditor(
  ctx: BehaviourContext,
  overlay: Overlay,
  cm: ContextMenu,
  event: Event,
  selected: Element,
): void {
  if (!ctx.layout) {
    throw new Error(
      "createStyleableBehaviour requires BehaviourContext.layout (AdjustableLayout session)",
    );
  }

  cm.clear();
  overlay.destroy();
  overlay.ensureOverlay();

  const id = selected.getAttribute("id")!;
  const placement = ctx.layout.layout.placements[id];
  const originalMargin =
    placement && "margin" in placement && placement.margin
      ? { ...placement.margin }
      : undefined;

  const pending: Record<MarginProp, number> = {
    "margin-top":
      originalMargin?.top ?? readCssPx(selected, "margin-top", 0),
    "margin-right":
      originalMargin?.right ?? readCssPx(selected, "margin-right", 0),
    "margin-bottom":
      originalMargin?.bottom ?? readCssPx(selected, "margin-bottom", 0),
    "margin-left":
      originalMargin?.left ?? readCssPx(selected, "margin-left", 0),
  };

  const bbox = getElementDiagramBBox(selected, ctx.root);
  const top = pending["margin-top"];
  const right = pending["margin-right"];
  const bottom = pending["margin-bottom"];
  const left = pending["margin-left"];

  const [moveTop, moveRight, moveBottom, moveLeft] = overlay.createSizingRect(
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    top,
    right,
    bottom,
    left,
  );

  const onChange =
    (name: MarginProp, moveRect: (n: number) => void) => (l: number) => {
      pending[name] = l;
      moveRect(l);
      // Preview track occupancy — style commands wait for OK.
      applyMarginsToLayout(ctx, id, pendingToInsets(pending));
    };

  overlay.createSizingArrow(
    bbox.x + bbox.width / 2,
    bbox.y,
    top,
    false,
    true,
    onChange("margin-top", moveTop),
  );
  overlay.createSizingArrow(
    bbox.x + bbox.width,
    bbox.y + bbox.height / 2,
    right,
    true,
    false,
    onChange("margin-right", moveRight),
  );
  overlay.createSizingArrow(
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height,
    bottom,
    false,
    false,
    onChange("margin-bottom", moveBottom),
  );
  overlay.createSizingArrow(
    bbox.x,
    bbox.y + bbox.height / 2,
    left,
    true,
    true,
    onChange("margin-left", moveLeft),
  );

  const rect = selected.getBoundingClientRect();
  const form = cm.get(event);
  const menu = form.parentElement;
  if (menu) {
    menu.style.left = `${rect.right + 8}px`;
    menu.style.top = `${rect.top}px`;
  }

  cm.addOkCancel(
    event,
    () => {
      const insets = pendingToInsets(pending);
      const cssMargins = [
        insets.top,
        insets.right,
        insets.bottom,
        insets.left,
      ];
      for (let i = 0; i < MARGIN_PROPS.length; i++) {
        replaceStyle(ctx, id, selected, MARGIN_PROPS[i]!, `${cssMargins[i]}px`);
      }
      // Asymmetric insets need start alignment in the grid cell.
      const any = cssMargins.some((n) => n > 0);
      replaceStyle(
        ctx,
        id,
        selected,
        "justify-self",
        any ? "start" : "center",
      );
      replaceStyle(ctx, id, selected, "align-self", any ? "start" : "center");

      applyMarginsToLayout(ctx, id, insets);
      cm.destroy();
      overlay.destroy();
    },
    () => {
      const session = ctx.layout!;
      if (originalMargin) {
        applyMarginsToLayout(ctx, id, originalMargin);
      } else if (session.layout.placements[id]) {
        session.layout.clearMargin(id);
        session.apply();
      }
      cm.destroy();
      overlay.destroy();
    },
  );
}
