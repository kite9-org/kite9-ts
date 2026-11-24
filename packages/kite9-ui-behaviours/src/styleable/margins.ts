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

const MARGIN_PROPS = [
  "--kite9-margin-top",
  "--kite9-margin-right",
  "--kite9-margin-bottom",
  "--kite9-margin-left",
] as const;

type MarginProp = (typeof MARGIN_PROPS)[number];

/** CSS box properties written alongside the kite9 margin vars on OK. */
const CSS_MARGIN_PROPS = [
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
] as const;

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
    top: Math.round(pending["--kite9-margin-top"]),
    right: Math.round(pending["--kite9-margin-right"]),
    bottom: Math.round(pending["--kite9-margin-bottom"]),
    left: Math.round(pending["--kite9-margin-left"]),
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
    "--kite9-margin-top":
      originalMargin?.top ?? readCssPx(selected, "--kite9-margin-top", 0),
    "--kite9-margin-right":
      originalMargin?.right ?? readCssPx(selected, "--kite9-margin-right", 0),
    "--kite9-margin-bottom":
      originalMargin?.bottom ??
      readCssPx(selected, "--kite9-margin-bottom", 0),
    "--kite9-margin-left":
      originalMargin?.left ?? readCssPx(selected, "--kite9-margin-left", 0),
  };

  const bbox = getElementDiagramBBox(selected, ctx.root);
  const top = pending["--kite9-margin-top"];
  const right = pending["--kite9-margin-right"];
  const bottom = pending["--kite9-margin-bottom"];
  const left = pending["--kite9-margin-left"];

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
    onChange("--kite9-margin-top", moveTop),
  );
  overlay.createSizingArrow(
    bbox.x + bbox.width,
    bbox.y + bbox.height / 2,
    right,
    true,
    false,
    onChange("--kite9-margin-right", moveRight),
  );
  overlay.createSizingArrow(
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height,
    bottom,
    false,
    false,
    onChange("--kite9-margin-bottom", moveBottom),
  );
  overlay.createSizingArrow(
    bbox.x,
    bbox.y + bbox.height / 2,
    left,
    true,
    true,
    onChange("--kite9-margin-left", moveLeft),
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
        const px = `${cssMargins[i]}px`;
        replaceStyle(ctx, id, selected, MARGIN_PROPS[i]!, px);
        replaceStyle(ctx, id, selected, CSS_MARGIN_PROPS[i]!, px);
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

      // Layout already matches pending from drag; re-apply in case of no-drag OK.
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
