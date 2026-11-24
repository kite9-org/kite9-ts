import {
  getDiagramCoords,
  getDiagramStage,
  getEditOverlayHost,
  svg,
} from "../screen.js";

const OVERLAY_CSS = `
._overlay rect._background {
  fill: white;
  fill-opacity: 0.5;
  stroke: none;
  pointer-events: none;
}
._overlay path._sizing,
._overlay path._sizing-marker {
  stroke: #fd9870;
  stroke-opacity: 1;
  stroke-width: 1px;
  stroke-dasharray: 2 2;
  fill: none;
}
._overlay rect._sizing {
  stroke: #fd9870;
  stroke-opacity: 1;
  stroke-width: 2px;
  stroke-dasharray: 2 2;
  fill: none;
}
._overlay ellipse {
  fill: #fd9870;
  fill-opacity: 1;
  cursor: pointer;
  pointer-events: all;
}
`;

/**
 * Draw extra controls around the edge of a diagram element (sizing arrows).
 * Hosted in the diagram shadow edit-overlay / stage.
 */
export class Overlay {
  sizing: ((e: Event) => void) | null = null;
  private readonly root: Element;
  private styleEl: HTMLStyleElement | null = null;

  constructor(root: Element) {
    this.root = root;
  }

  destroy(): void {
    const host = getEditOverlayHost(this.root);
    host?.querySelectorAll("svg._overlay, g._overlay").forEach((e) => {
      e.parentElement?.removeChild(e);
    });
    this.styleEl?.remove();
    this.styleEl = null;
    this.sizing = null;
  }

  ensureOverlay(): Element {
    const endSize = (e: Event) => {
      this.sizing = null;
      e.stopPropagation();
    };

    const moveSize = (e: Event) => {
      if (this.sizing) {
        this.sizing(e);
      }
    };

    const host = getEditOverlayHost(this.root);
    if (!host) {
      throw new Error("No edit overlay host on diagram");
    }

    if (!this.styleEl) {
      const shadow = (this.root as HTMLElement).shadowRoot;
      if (shadow) {
        this.styleEl = document.createElement("style");
        this.styleEl.setAttribute("data-kite9-overlay", "");
        this.styleEl.textContent = OVERLAY_CSS;
        shadow.appendChild(this.styleEl);
      }
    }

    let controlContainer = host.querySelector("svg._overlay") as SVGElement | null;
    if (!controlContainer) {
      const stage = getDiagramStage(this.root);
      const w = stage?.clientWidth || 800;
      const h = stage?.clientHeight || 600;

      controlContainer = svg(
        "svg",
        {
          class: "_overlay",
          part: "edit-overlay-svg",
          width: String(w),
          height: String(h),
          style:
            "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;",
        },
        [
          svg("rect", {
            width: "100%",
            height: "100%",
            class: "_background",
          }),
          svg("defs", {}, [
            svg(
              "marker",
              {
                id: "k9-sizing-arrow",
                markerHeight: "80",
                markerWidth: "80",
                orient: "auto-start-reverse",
                refX: "80",
                refY: "40",
              },
              [
                svg("path", {
                  d: "M80 40 L60 20 M 80 40 L 60 60",
                  class: "_sizing-marker",
                }),
              ],
            ),
          ]),
        ],
      );

      controlContainer.style.pointerEvents = "none";
      controlContainer.addEventListener("mouseup", endSize);
      controlContainer.addEventListener("touchend", endSize);
      controlContainer.addEventListener("touchmove", moveSize);
      controlContainer.addEventListener("mousemove", moveSize);
      // Dragging a handle ends with a click; keep it off actionable / menu dismiss.
      controlContainer.addEventListener("click", (e) => e.stopPropagation());

      // Prefer dedicated edit-overlay slot; else append to stage
      const overlaySlot = host.matches("[part='edit-overlay'],.edit-overlay")
        ? host
        : host.querySelector("[part='edit-overlay'],.edit-overlay") ?? host;
      (overlaySlot as HTMLElement).style.position ||= "relative";
      overlaySlot.appendChild(controlContainer);
    }

    return controlContainer;
  }

  createSizingRect(
    x: number,
    y: number,
    width: number,
    height: number,
    _up: number,
    _right: number,
    _down: number,
    _left: number,
  ): [
    (up: number) => void,
    (right: number) => void,
    (down: number) => void,
    (left: number) => void,
  ] {
    const controlContainer = this.ensureOverlay();
    const rect = svg("rect", { class: "_sizing" });
    controlContainer.appendChild(rect);

    let up = _up;
    let right = _right;
    let down = _down;
    let left = _left;

    const setSize = (u: number, r: number, d: number, l: number) => {
      rect.setAttribute("x", `${x - l}`);
      rect.setAttribute("y", `${y - u}`);
      rect.setAttribute("width", `${width + l + r}`);
      rect.setAttribute("height", `${height + u + d}`);
      up = u;
      down = d;
      left = l;
      right = r;
    };

    setSize(up, right, down, left);

    return [
      (u) => setSize(u, right, down, left),
      (r) => setSize(up, r, down, left),
      (d) => setSize(up, right, d, left),
      (l) => setSize(up, right, down, l),
    ];
  }

  createSizingArrow(
    fx: number,
    fy: number,
    length: number,
    horiz: boolean,
    inverse: boolean,
    cb: (l: number) => void,
  ): (length: number) => void {
    const controlContainer = this.ensureOverlay();
    // Enable pointer events on the overlay while arrows exist
    (controlContainer as SVGElement).style.pointerEvents = "auto";

    const line = svg("path", {
      class: "_sizing",
      "marker-start": "url(#k9-sizing-arrow)",
      "marker-end": "url(#k9-sizing-arrow)",
    });

    const handle = svg("ellipse", {
      rx: "8",
      ry: "8",
      style: "pointer-events:all;",
    });

    controlContainer.appendChild(line);
    controlContainer.appendChild(handle);

    let currentLength = length;
    let initial = { x: 0, y: 0 };

    const setSize = (len: number) => {
      let safe = len;
      if (Number.isNaN(safe)) safe = 0;
      const start = `M${fx} ${fy}`;
      const ex = horiz ? (inverse ? fx - safe : fx + safe) : fx;
      const ey = horiz ? fy : inverse ? fy - safe : fy + safe;
      line.setAttribute("d", start + ` L${ex} ${ey}`);
      handle.setAttribute("cx", `${ex}`);
      handle.setAttribute("cy", `${ey}`);
      initial = { x: ex, y: ey };
      currentLength = safe;
    };

    const move = (e: Event) => {
      const newCoords = getDiagramCoords(e, this.root);
      const delta = { x: newCoords.x - initial.x, y: newCoords.y - initial.y };
      const newLength = Math.round(
        horiz
          ? inverse
            ? currentLength - delta.x
            : currentLength + delta.x
          : inverse
            ? currentLength - delta.y
            : currentLength + delta.y,
      );
      const clamped = Math.max(0, newLength);
      setSize(clamped);
      cb(clamped);
      // Re-anchor next delta from new handle position
      initial = getDiagramCoords(e, this.root);
    };

    const onPointerDown = (e: PointerEvent) => {
      handle.setPointerCapture(e.pointerId);
      this.sizing = move;
      initial = getDiagramCoords(e, this.root);
      e.stopPropagation();
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.sizing !== move) return;
      move(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.sizing === move) this.sizing = null;
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
      e.stopPropagation();
    };

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);

    setSize(length);

    return setSize;
  }
}
