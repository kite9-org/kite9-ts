import type { Area, Direction, Point } from "./types.js";

/** Diagram root (`kite9-diagram`) for coordinate helpers. */
let diagramRoot: Element | null = null;

export function setDiagramRoot(root: Element | null): void {
  diagramRoot = root;
}

export function getDiagramRoot(): Element | null {
  return diagramRoot;
}

/** Open shadow stage for the diagram root, if present. */
export function getDiagramStage(root: Element = diagramRoot!): HTMLElement | null {
  const shadow = (root as HTMLElement).shadowRoot;
  if (!shadow) return null;
  return shadow.querySelector<HTMLElement>(".stage,[part='stage']");
}

export function getLinksLayer(root: Element = diagramRoot!): SVGSVGElement | null {
  const shadow = (root as HTMLElement).shadowRoot;
  if (!shadow) return null;
  return shadow.querySelector<SVGSVGElement>(".links-layer,[part='links']");
}

export function getEditOverlayHost(root: Element = diagramRoot!): Element | null {
  const shadow = (root as HTMLElement).shadowRoot;
  if (!shadow) return null;
  return (
    shadow.querySelector("[part='edit-overlay'],.edit-overlay") ??
    getDiagramStage(root)
  );
}

export function getHtmlCoords(evt: Event): Point {
  if (evt instanceof MouseEvent) {
    return { x: evt.clientX, y: evt.clientY };
  }
  if (typeof TouchEvent !== "undefined" && evt instanceof TouchEvent) {
    const t = evt.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  throw new Error("Unsupported event type");
}

/**
 * Pointer coords relative to the diagram stage (or root).
 */
export function getDiagramCoords(
  evt: Event,
  root: Element = diagramRoot!,
): Point {
  const page = getHtmlCoords(evt);
  const stage = getDiagramStage(root) ?? (root as HTMLElement);
  const rect = stage.getBoundingClientRect();
  return {
    x: page.x - rect.left,
    y: page.y - rect.top,
  };
}

/** BBox relative to the diagram stage. */
export function getElementDiagramBBox(
  e: Element,
  root: Element = diagramRoot!,
): Area {
  const elRect = e.getBoundingClientRect();
  const stage = getDiagramStage(root) ?? (root as HTMLElement);
  const stageRect = stage.getBoundingClientRect();
  return {
    x: elRect.left - stageRect.left,
    y: elRect.top - stageRect.top,
    width: elRect.width,
    height: elRect.height,
  };
}

export function maxArea(elements: Area[]): Area {
  if (elements.length === 0) {
    throw new Error("No elements provided");
  }
  if (elements.length === 1) {
    return elements[0]!;
  }

  type Bound = { x: number; y: number; x2: number; y2: number };

  const bounds: Bound[] = elements.map((bb) => ({
    x: bb.x,
    y: bb.y,
    x2: bb.x + bb.width,
    y2: bb.y + bb.height,
  }));

  const bound = bounds.reduce((a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    x2: Math.max(a.x2, b.x2),
    y2: Math.max(a.y2, b.y2),
  }));

  return {
    x: bound.x,
    y: bound.y,
    width: bound.x2 - bound.x,
    height: bound.y2 - bound.y,
  };
}

export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * More reliable current target for mouse/touch (uses elementFromPoint).
 */
export function currentTarget(event: Event): Element | null {
  const anyEvent = event as Event & { touchTarget?: Element | null };
  if (anyEvent.touchTarget) {
    return anyEvent.touchTarget;
  }

  const coords = getHtmlCoords(event);
  const v = document.elementFromPoint(coords.x, coords.y);
  anyEvent.touchTarget = v;
  return v;
}

export function currentTargets(event: Event): Element[] {
  const anyEvent = event as Event & { touchTargets?: Element[] };
  if (anyEvent.touchTargets) {
    return anyEvent.touchTargets;
  }

  const coords = getHtmlCoords(event);
  const v = document.elementsFromPoint(coords.x, coords.y);
  anyEvent.touchTargets = v;
  return v;
}

export function svg(
  tag: string,
  atts: Record<string, string | null | undefined> = {},
  contents: Element[] = [],
): SVGElement {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const key of Object.keys(atts)) {
    const val = atts[key];
    if (val != null) {
      e.setAttribute(key, val);
    }
  }
  for (const c of contents) {
    e.appendChild(c);
  }
  return e;
}

export function closestSide(
  dropTarget: Element,
  eventCoords: Point = { x: 0, y: 0 },
): Direction {
  // Client-space, same as getHtmlCoords (clientX / clientY).
  const box = dropTarget.getBoundingClientRect();

  const topDist = Math.abs(eventCoords.y - box.top);
  const leftDist = Math.abs(eventCoords.x - box.left);
  const bottomDist = Math.abs(box.top + box.height - eventCoords.y);
  const rightDist = Math.abs(box.left + box.width - eventCoords.x);

  type Pair = { d: Direction; a: number };

  const dists: Pair[] = [
    { d: "up", a: topDist },
    { d: "right", a: rightDist },
    { d: "down", a: bottomDist },
    { d: "left", a: leftDist },
  ];

  const bestSide = dists.reduce(
    (a, b) => (a.a < b.a ? a : b),
    { d: "up" as Direction, a: 10000 },
  );

  return bestSide.d;
}
