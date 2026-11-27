import { ReplaceStyle } from "@kite9/command";
import type { BehaviourContext } from "@kite9/ui";
import { hasAffordance, isRectangular } from "@kite9/ui";
import { applySizeToLayout } from "../layout-edit.js";

const MIN_W = 40;
const MIN_H = 32;
const HANDLE_CLASS = "kite9-resize-handle";
const HANDLE_STYLE_ATTR = "data-kite9-resize-style";

const HANDLE_CSS = `
.${HANDLE_CLASS} {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 10px;
  height: 10px;
  padding: 0;
  border: 1px solid #64748b;
  border-radius: 2px;
  background: #e2e8f0;
  cursor: nwse-resize;
  z-index: 3;
  box-sizing: border-box;
}
`;

function ensureHandleStyles(shadow: ShadowRoot): void {
  if (shadow.querySelector(`style[${HANDLE_STYLE_ATTR}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(HANDLE_STYLE_ATTR, "");
  style.textContent = HANDLE_CSS;
  shadow.appendChild(style);
}

function ensureHostPositioned(host: Element): void {
  const el = host as HTMLElement;
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }
}

/** Read `width`/`height` only when the inline style is px; else use the box. */
function pxSizeOrBox(host: HTMLElement, dim: "width" | "height"): number {
  const raw = dim === "width" ? host.style.width : host.style.height;
  if (raw.endsWith("px")) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const box = host.getBoundingClientRect();
  return dim === "width" ? box.width : box.height;
}

/**
 * Floor size so a container resize (bottom-right handle) cannot clip light-DOM
 * children: keep top/left chrome, hug content on the trailing edges.
 */
function minSizeForContents(host: Element): { w: number; h: number } {
  const hostBox = host.getBoundingClientRect();
  // Chrome padding/border often lives on the shadow card, not :host.
  const card = host.shadowRoot?.querySelector(
    "[part='card'], .container-card, .glyph-card, .key-card",
  ) as HTMLElement | null;
  const cs = getComputedStyle(card ?? host);
  const padR =
    (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const padB =
    (parseFloat(cs.paddingBottom) || 0) +
    (parseFloat(cs.borderBottomWidth) || 0);

  let needW = MIN_W;
  let needH = MIN_H;
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement)) continue;
    // Links are display:none layout hosts — ignore.
    if (child.localName === "kite9-link") continue;
    const box = child.getBoundingClientRect();
    if (box.width < 1 && box.height < 1) continue;
    needW = Math.max(needW, box.right - hostBox.left + padR);
    needH = Math.max(needH, box.bottom - hostBox.top + padB);
  }
  return { w: Math.ceil(needW), h: Math.ceil(needH) };
}

/**
 * Create / remove resize handles on selected hosts that declare `k9-ui` size.
 * Handles live in the host shadow — not in the view template.
 * Size changes update `AdjustableLayout` then re-apply layout to the DOM.
 */
export function activateChromeResize(ctx: BehaviourContext): () => void {
  const { root, command } = ctx;
  const handles = new Map<Element, HTMLElement>();
  const cleanups: Array<() => void> = [];

  const removeHandle = (host: Element) => {
    const handle = handles.get(host);
    if (!handle) return;
    handle.remove();
    handles.delete(host);
  };

  const wireHandle = (host: Element, handle: HTMLElement) => {
    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      // Prefer authored px; never parseFloat("100%") — that yields 100.
      const startW = pxSizeOrBox((host as HTMLElement), "width");
      const startH = pxSizeOrBox((host as HTMLElement), "height");
      const id = host.getAttribute("id");
      if (!id) return;
      // Capture once — live DOM during drag already reflects clamped sizes.
      const floor = minSizeForContents(host);

      handle.setPointerCapture?.(event.pointerId);

      const clamp = (rawW: number, rawH: number) => ({
        w: Math.round(Math.max(floor.w, rawW)),
        h: Math.round(Math.max(floor.h, rawH)),
      });

      const move = (ev: PointerEvent) => {
        const { w, h } = clamp(
          startW + (ev.clientX - startX),
          startH + (ev.clientY - startY),
        );
        applySizeToLayout(ctx, id, { w, h }, host);
      };

      const up = (ev: PointerEvent) => {
        handle.releasePointerCapture?.(ev.pointerId);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);

        const { w, h } = clamp(
          startW + (ev.clientX - startX),
          startH + (ev.clientY - startY),
        );

        const widthCmd = new ReplaceStyle();
        widthCmd.fragmentId = id;
        widthCmd.name = "width";
        widthCmd.from = command.getStyleValue(host, "width");
        widthCmd.to = `${w}px`;
        widthCmd.apply(command);

        const heightCmd = new ReplaceStyle();
        heightCmd.fragmentId = id;
        heightCmd.name = "height";
        heightCmd.from = command.getStyleValue(host, "height");
        heightCmd.to = `${h}px`;
        heightCmd.apply(command);

        applySizeToLayout(ctx, id, { w, h }, host);
      };

      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    };

    handle.addEventListener("pointerdown", onDown);
    cleanups.push(() => handle.removeEventListener("pointerdown", onDown));
  };

  const sync = () => {
    const selected = new Set(
      Array.from(root.querySelectorAll(".selected")).filter(
        (el) => isRectangular(el) && hasAffordance(el, "size"),
      ),
    );

    for (const host of handles.keys()) {
      if (!selected.has(host)) removeHandle(host);
    }

    for (const host of selected) {
      if (handles.has(host)) continue;
      const shadow = (host as HTMLElement).shadowRoot;
      if (!shadow) continue;

      ensureHostPositioned(host);
      ensureHandleStyles(shadow);

      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = HANDLE_CLASS;
      handle.setAttribute("part", "resize");
      handle.setAttribute(
        "aria-label",
        `Resize ${host.getAttribute("label") || host.getAttribute("id") || "element"}`,
      );
      shadow.appendChild(handle);
      handles.set(host, handle);
      wireHandle(host, handle);
    }
  };

  root.addEventListener("kite9-selection-change", sync);
  sync();

  const mo = new MutationObserver(() => sync());
  mo.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "k9-ui"],
  });

  return () => {
    root.removeEventListener("kite9-selection-change", sync);
    mo.disconnect();
    for (const c of cleanups) c();
    for (const host of [...handles.keys()]) removeHandle(host);
  };
}
