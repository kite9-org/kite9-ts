/**
 * Functional layout validation — spirit of Java
 * `AbstractLayoutFunctionalTest` / `TestingEngine.Checks` + `testDiagram`.
 */

import {
  DiagramElementSizing,
  DiagramElementType,
  Dimension,
  Direction,
  Layout,
  Measurement,
  type Connected,
  type Connection,
  type Diagram,
  type DiagramElement,
  type GridContainerPosition,
  type LayoutData,
  type LayoutPlacement,
  type Placement,
  type Rectangular,
  type RouteRenderingInformation,
} from "@kite9/model";
import { contentColSpan, contentRowSpan, edgeCoords } from "@kite9/ui";
import {
  getRouteDirection,
  ROUTE_MULTIPLE,
  ROUTE_NONE,
  type RouteDirectionResult,
} from "./diagram-checker.js";
import type { LinkTest } from "./link.js";

/** Toggle flags — defaults match `AbstractLayoutFunctionalTest`. */
export type LayoutChecks = {
  checkEdgeDirections: boolean;
  checkNoHops: boolean;
  everythingStraight: boolean;
  checkLayout: boolean;
  checkNoContradictions: boolean;
  checkOcclusion: boolean;
  checkConnectionsMeetConnecteds: boolean;
  checkMidConnection: boolean;
};

/**
 * Defaults: layout/thorough/performance match Java `AbstractLayoutFunctionalTest`
 * (`checkNoHops` / `everythingStraight` on). Display matches
 * `AbstractDisplayFunctionalTest` (hops / straightness off).
 */
export function defaultLayoutChecks(
  kind: "display" | "layout" | "thorough" | "performance" = "display",
): LayoutChecks {
  const layoutLike = kind !== "display";
  return {
    checkEdgeDirections: true,
    checkNoHops: layoutLike,
    everythingStraight: layoutLike,
    checkLayout: true,
    checkNoContradictions: true,
    checkOcclusion: true,
    checkConnectionsMeetConnecteds: true,
    checkMidConnection: true,
  };
}

export class LayoutCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayoutCheckError";
  }
}

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function isConnection(de: DiagramElement): de is Connection {
  return de.getType() === DiagramElementType.CONNECTION;
}

function isConnected(de: DiagramElement): de is Connected {
  return typeof (de as Partial<Connected>).getLinks === "function";
}

function isConnectedRectangular(de: DiagramElement): boolean {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
}

/** Skip layout-only temps (Java skips TemporaryConnected / ConnectedGroupLinkNode). */
function isLayoutTemporary(de: DiagramElement): boolean {
  const id = de.getID();
  // ConnectedGroupLinkNode suffixes: -und, -bareleaf, -dlN, -grid-(x, y)
  return (
    /--(und|bareleaf|dl\d+|grid-)/.test(id) ||
    id.includes("-tmp-") ||
    id.includes("--tmp-")
  );
}

function walk(root: Rectangular, visit: (de: DiagramElement) => void): void {
  visit(root);
  for (const c of root.getContents()) {
    visit(c);
    if (isRectangular(c)) walk(c, visit);
  }
}

function hasCell(
  p: LayoutPlacement,
): p is {
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
  size?: { w: number; h: number };
} {
  return "col" in p && "row" in p;
}

function cellSpan(p: {
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
}): { c0: number; c1: number; r0: number; r1: number } {
  return {
    c0: p.col,
    c1: p.colEnd ?? p.col,
    r0: p.row,
    r1: p.rowEnd ?? p.row,
  };
}

function cellsOverlap(
  a: ReturnType<typeof cellSpan>,
  b: ReturnType<typeof cellSpan>,
): boolean {
  return !(a.c1 < b.c0 || b.c1 < a.c0 || a.r1 < b.r0 || b.r1 < a.r0);
}

function rectBox(de: DiagramElement): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const ri = de.getRenderingInformation();
  if (!ri.position || !ri.size) return null;
  return {
    x: ri.position.x(),
    y: ri.position.y(),
    w: ri.size.width(),
    h: ri.size.height(),
  };
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0.5,
): boolean {
  return !(
    a.x + a.w <= b.x + pad ||
    b.x + b.w <= a.x + pad ||
    a.y + a.h <= b.y + pad ||
    b.y + b.h <= a.y + pad
  );
}

function pointInExpandedRect(
  px: number,
  py: number,
  box: { x: number; y: number; w: number; h: number },
  pad = 1,
): boolean {
  return (
    px >= box.x - pad &&
    px <= box.x + box.w + pad &&
    py >= box.y - pad &&
    py <= box.y + box.h + pad
  );
}

/** Java `Link.LINK_TEST` / `contradicting` attribute on the connection host. */
export function linkTestOf(c: Connection): LinkTest | null {
  const el = (c as { el?: Element }).el;
  if (el) {
    const raw =
      el.getAttribute("link-test") ??
      el.getAttribute("linkTest") ??
      el.getAttribute("linktest");
    const v = raw?.trim().toLowerCase();
    if (v === "turn" || v === "hop" || v === "contradicting") return v;
    const contra = el.getAttribute("contradicting");
    if (contra != null && contra !== "false" && contra !== "0") {
      return "contradicting";
    }
  }
  return null;
}

function connectionsOf(diagram: Diagram): Connection[] {
  const out: Connection[] = [];
  const adapter = diagram as Diagram & { allConnections?: Connection[] };
  if (Array.isArray(adapter.allConnections)) {
    return [...adapter.allConnections];
  }
  walk(diagram, (de) => {
    if (isConnection(de)) out.push(de);
  });
  return out;
}

function assertLayoutData(layout: LayoutData, checks: LayoutChecks): void {
  if (checks.checkLayout) {
    const { contentCols, contentRows, contentColSizes, contentRowSizes } =
      layout.grid;
    if (contentColSizes.length !== contentCols) {
      throw new LayoutCheckError(
        `contentColSizes length ${contentColSizes.length} != contentCols ${contentCols}`,
      );
    }
    if (contentRowSizes.length !== contentRows) {
      throw new LayoutCheckError(
        `contentRowSizes length ${contentRowSizes.length} != contentRows ${contentRows}`,
      );
    }
    for (const [id, p] of Object.entries(layout.placements)) {
      if (!hasCell(p)) continue;
      if (p.size && !(p.size.w > 0 && p.size.h > 0)) {
        throw new LayoutCheckError(
          `placement ${id} has non-positive size ${p.size.w}×${p.size.h}`,
        );
      }
      const span = cellSpan(p);
      if (span.c0 < 1 || span.c1 > contentCols || span.r0 < 1 || span.r1 > contentRows) {
        throw new LayoutCheckError(
          `placement ${id} cell ${span.c0}-${span.c1},${span.r0}-${span.r1} outside ${contentCols}×${contentRows}`,
        );
      }
    }
  }

  if (checks.checkOcclusion) {
    const cells = Object.entries(layout.placements).filter(([, p]) => hasCell(p)) as [
      string,
      Extract<LayoutPlacement, { col: number }>,
    ][];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const [idA, a] = cells[i]!;
        const [idB, b] = cells[j]!;
        if (cellsOverlap(cellSpan(a), cellSpan(b))) {
          throw new LayoutCheckError(
            `placements overlap in grid: ${idA} and ${idB}`,
          );
        }
      }
    }
  }
}

function checkBefore(
  x1: number,
  w1: number,
  x2: number,
  _w2: number,
  prev: DiagramElement,
  cc: DiagramElement,
  l: Layout,
): void {
  if (x1 + w1 > x2) {
    throw new LayoutCheckError(
      `Was expecting ${prev.getID()} before ${cc.getID()} ${l}`,
    );
  }
}

function checkAligned(
  x1: number,
  w1: number,
  x2: number,
  w2: number,
  prev: DiagramElement,
  cc: DiagramElement,
  l: Layout,
): void {
  if (x1 + w1 < x2) {
    throw new LayoutCheckError(
      `Was expecting alignment of ${prev.getID()} and ${cc.getID()} ${l}`,
    );
  }
  if (x2 + w2 < x1) {
    throw new LayoutCheckError(
      `Was expecting some alignment of ${prev.getID()} and ${cc.getID()} ${l}`,
    );
  }
}

/** Java `TestingEngine.checkLayoutOrder` (intended: advance prev on each Connected). */
function checkLayoutOrder(d: Rectangular, l: Layout): void {
  let prev: Connected | null = null;
  for (const c of d.getContents()) {
    if (!isConnected(c) || isLayoutTemporary(c)) continue;
    if (prev != null) {
      const prevRI = prev.getRenderingInformation();
      const ccRI = c.getRenderingInformation();
      if (!prevRI.position || !prevRI.size || !ccRI.position || !ccRI.size) {
        prev = c;
        continue;
      }
      const prevPos = { x: prevRI.position.x(), y: prevRI.position.y() };
      const ccPos = { x: ccRI.position.x(), y: ccRI.position.y() };
      const prevSize = { w: prevRI.size.width(), h: prevRI.size.height() };
      const ccSize = { w: ccRI.size.width(), h: ccRI.size.height() };

      switch (l) {
        case Layout.HORIZONTAL:
          checkAligned(prevPos.y, prevSize.h, ccPos.y, ccSize.h, prev, c, l);
          break;
        case Layout.LEFT:
          checkAligned(prevPos.y, prevSize.h, ccPos.y, ccSize.h, prev, c, l);
          checkBefore(ccPos.x, ccSize.w, prevPos.x, prevSize.w, c, prev, l);
          break;
        case Layout.RIGHT:
          checkAligned(prevPos.y, prevSize.h, ccPos.y, ccSize.h, prev, c, l);
          checkBefore(prevPos.x, prevSize.w, ccPos.x, ccSize.w, prev, c, l);
          break;
        case Layout.VERTICAL:
          checkAligned(prevPos.x, prevSize.w, ccPos.x, ccSize.w, prev, c, l);
          break;
        case Layout.UP:
          checkAligned(prevPos.x, prevSize.w, ccPos.x, ccSize.w, prev, c, l);
          checkBefore(ccPos.y, ccSize.h, prevPos.y, prevSize.h, c, prev, l);
          break;
        case Layout.DOWN:
          checkAligned(prevPos.x, prevSize.w, ccPos.x, ccSize.w, prev, c, l);
          checkBefore(prevPos.y, prevSize.h, ccPos.y, ccSize.h, prev, c, l);
          break;
        default:
          break;
      }
    }
    prev = c;
  }
}

/** Java `TestingEngine.checkContentsOverlap`. */
function checkContentsOverlap(d: Rectangular, l: Layout): void {
  const contRI: { x: number; y: number; w: number; h: number }[] = [];
  for (const c of d.getContents()) {
    if (!isConnectedRectangular(c) || isLayoutTemporary(c)) continue;
    const box = rectBox(c);
    if (box) contRI.push(box);
  }

  contRI.sort((a, b) =>
    l === Layout.HORIZONTAL ? a.x - b.x : a.y - b.y,
  );

  let last: (typeof contRI)[number] | null = null;
  for (const current of contRI) {
    if (last != null) {
      if (l === Layout.HORIZONTAL) {
        if (last.x + last.w > current.x) {
          throw new LayoutCheckError(
            `Elements of ${d.getID()} are not laid out horizontally`,
          );
        }
      } else if (l === Layout.VERTICAL) {
        if (last.y + last.h > current.y) {
          throw new LayoutCheckError(
            `Elements of ${d.getID()} are not laid out vertically`,
          );
        }
      }
    }
    last = current;
  }
}

function isGridPos(p: unknown): p is GridContainerPosition {
  return (
    !!p &&
    typeof (p as GridContainerPosition).isSet === "function" &&
    typeof (p as GridContainerPosition).getFrom === "function"
  );
}

/**
 * Java `checkContentsGrid` — only when children expose set grid occupies coords.
 * Otherwise skip (do not invent positions).
 */
function checkContentsGrid(con: Rectangular): void {
  const connecteds = con
    .getContents()
    .filter(
      (cc) => isConnectedRectangular(cc) && !isLayoutTemporary(cc),
    ) as Connected[];

  for (const c of connecteds) {
    const gcpCX = c.getContainerPosition?.(Dimension.H);
    const gcpCY = c.getContainerPosition?.(Dimension.V);
    if (!isGridPos(gcpCX) || !isGridPos(gcpCY) || !gcpCX.isSet() || !gcpCY.isSet()) {
      continue;
    }
    const rriC = rectBox(c);
    if (!rriC) continue;

    for (const d of connecteds) {
      if (d === c) continue;
      const gcpDX = d.getContainerPosition?.(Dimension.H);
      const gcpDY = d.getContainerPosition?.(Dimension.V);
      if (!isGridPos(gcpDX) || !isGridPos(gcpDY) || !gcpDX.isSet() || !gcpDY.isSet()) {
        continue;
      }
      const rriD = rectBox(d);
      if (!rriD) continue;

      if (gcpDX.getTo() < gcpCX.getFrom()) {
        checkBefore(rriD.x, rriD.w, rriC.x, rriC.w, d, c, Layout.RIGHT);
      }
      if (gcpDX.getFrom() > gcpCX.getTo()) {
        checkBefore(rriC.x, rriC.w, rriD.x, rriD.w, c, d, Layout.RIGHT);
      }
      if (gcpDY.getTo() < gcpCY.getFrom()) {
        checkBefore(rriD.y, rriD.h, rriC.y, rriC.h, d, c, Layout.DOWN);
      }
      if (gcpDY.getFrom() > gcpCY.getTo()) {
        checkBefore(rriC.y, rriC.h, rriD.y, rriD.h, c, d, Layout.DOWN);
      }
    }
  }
}

/** Java `TestingEngine.testLayout` — directed order / axis overlap / grid. */
function testLayoutRecursive(d: Rectangular): void {
  const l = d.getLayout();
  if (l != null) {
    switch (l) {
      case Layout.LEFT:
      case Layout.RIGHT:
      case Layout.UP:
      case Layout.DOWN:
        checkLayoutOrder(d, l);
        break;
      case Layout.HORIZONTAL:
      case Layout.VERTICAL:
        checkContentsOverlap(d, l);
        break;
      case Layout.GRID:
        checkContentsGrid(d);
        break;
      default:
        break;
    }
  }

  for (const cc of d.getContents()) {
    if (
      cc.getType() === DiagramElementType.LABEL ||
      isLayoutTemporary(cc)
    ) {
      continue;
    }
    const ri = cc.getRenderingInformation();
    if (ri.position && ri.size && isRectangular(d)) {
      const inside = rectBox(cc);
      const outside = rectBox(d);
      if (
        inside &&
        outside &&
        inside.w > 0 &&
        inside.h > 0 &&
        (inside.x < outside.x - 1 ||
          inside.y < outside.y - 1 ||
          inside.x + inside.w > outside.x + outside.w + 1 ||
          inside.y + inside.h > outside.y + outside.h + 1)
      ) {
        throw new LayoutCheckError(
          `${cc.getID()} not entirely within ${d.getID()}`,
        );
      }
    }
    if (isRectangular(cc)) testLayoutRecursive(cc);
  }
}

function assertDiagramLayout(diagram: Diagram, checks: LayoutChecks): void {
  if (checks.checkLayout) {
    walk(diagram, (de) => {
      if (de.getType() !== DiagramElementType.CONNECTED_RECTANGULAR) return;
      if (isLayoutTemporary(de)) return;
      const box = rectBox(de);
      if (!box) {
        throw new LayoutCheckError(
          `connected ${de.getID()} missing position/size after layout`,
        );
      }
      if (!(box.w > 0 && box.h > 0)) {
        throw new LayoutCheckError(
          `connected ${de.getID()} has non-positive size ${box.w}×${box.h}`,
        );
      }
      const parent = de.getContainer();
      if (parent && parent.getType() !== DiagramElementType.DIAGRAM) {
        const outer = rectBox(parent);
        if (
          outer &&
          outer.w > 0 &&
          outer.h > 0 &&
          (box.x < outer.x - 1 ||
            box.y < outer.y - 1 ||
            box.x + box.w > outer.x + outer.w + 1 ||
            box.y + box.h > outer.y + outer.h + 1)
        ) {
          throw new LayoutCheckError(
            `${de.getID()} not entirely within ${parent.getID()}`,
          );
        }
      }
    });
    testLayoutRecursive(diagram);
  }

  if (checks.checkOcclusion) {
    const rects: { id: string; box: NonNullable<ReturnType<typeof rectBox>> }[] =
      [];
    walk(diagram, (de) => {
      if (de.getType() !== DiagramElementType.CONNECTED_RECTANGULAR) return;
      if (isLayoutTemporary(de)) return;
      const box = rectBox(de);
      if (box && box.w > 0 && box.h > 0) rects.push({ id: de.getID(), box });
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        // Nested containment is OK; improper peer overlap is not.
        const aInB =
          a.box.x >= b.box.x - 1 &&
          a.box.y >= b.box.y - 1 &&
          a.box.x + a.box.w <= b.box.x + b.box.w + 1 &&
          a.box.y + a.box.h <= b.box.y + b.box.h + 1;
        const bInA =
          b.box.x >= a.box.x - 1 &&
          b.box.y >= a.box.y - 1 &&
          b.box.x + b.box.w <= a.box.x + a.box.w + 1 &&
          b.box.y + b.box.h <= a.box.y + a.box.h + 1;
        if (!aInB && !bInA && boxesOverlap(a.box, b.box)) {
          throw new LayoutCheckError(
            `occlusion: ${a.id} overlaps ${b.id}`,
          );
        }
      }
    }
  }
}

function placementBox(
  layout: LayoutData,
  id: string,
): { x: number; y: number; w: number; h: number } | null {
  const p = layout.placements[id];
  if (!p || !hasCell(p)) return null;
  const cs = contentColSpan(layout.grid, p.col);
  const rs = contentRowSpan(layout.grid, p.row);
  const xs = edgeCoords(layout.grid.colSizes);
  const ys = edgeCoords(layout.grid.rowSizes);
  const x0 = xs[cs.start]!;
  const y0 = ys[rs.start]!;
  return {
    x: x0,
    y: y0,
    w: xs[cs.start + cs.count]! - x0,
    h: ys[rs.start + rs.count]! - y0,
  };
}

/** Stage element that owns the SVG link layer (route coords are stage-local). */
function stageOf(diagram: Diagram): Element | null {
  const el = (diagram as { el?: Element }).el;
  return el?.shadowRoot?.querySelector(".stage") ?? null;
}

/**
 * Painted border box of a connected, in stage/SVG coordinates.
 * Prefer this over the placement cell so SVG endpoints must hit the glyph,
 * not an oversized empty cell.
 */
function connectedPaintBox(
  de: DiagramElement,
  stage: Element,
): { x: number; y: number; w: number; h: number } | null {
  const el = (de as { el?: Element }).el;
  if (!(el instanceof Element)) return null;
  const a = el.getBoundingClientRect();
  const o = stage.getBoundingClientRect();
  if (!(a.width > 0 && a.height > 0)) return null;
  return {
    x: a.left - o.left,
    y: a.top - o.top,
    w: a.width,
    h: a.height,
  };
}

/**
 * True when an orthogonal segment crosses the open interior of `box`
 * (edge contact alone does not count — that is a legal meet).
 */
function segmentCrossesInterior(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: { x: number; y: number; w: number; h: number },
  inset = 1,
): boolean {
  const x0 = box.x + inset;
  const y0 = box.y + inset;
  const x1 = box.x + box.w - inset;
  const y1 = box.y + box.h - inset;
  if (x1 <= x0 || y1 <= y0) return false;

  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  // Horizontal
  if (Math.abs(a.y - b.y) <= 0.5) {
    const y = (a.y + b.y) / 2;
    if (y <= y0 || y >= y1) return false;
    return maxX > x0 && minX < x1;
  }
  // Vertical
  if (Math.abs(a.x - b.x) <= 0.5) {
    const x = (a.x + b.x) / 2;
    if (x <= x0 || x >= x1) return false;
    return maxY > y0 && minY < y1;
  }
  // Non-orthogonal: sample midpoint (remap noise should already be orthogonalized).
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return mx > x0 && mx < x1 && my > y0 && my < y1;
}

function routeEndPoint(
  rri: RouteRenderingInformation,
  start: boolean,
): { x: number; y: number } | null {
  const len = rri.getLength?.() ?? rri.routePositions?.length ?? 0;
  if (len === 0) return null;
  const d = start
    ? (rri.getWaypoint?.(0) ?? rri.routePositions?.[0])
    : (rri.getWaypoint?.(len - 1) ?? rri.routePositions?.[len - 1]);
  if (!d) return null;
  return { x: d.x(), y: d.y() };
}

function getConnectionSide(
  c: Connection,
  v: Connected,
  r: { x: number; y: number; w: number; h: number },
): Direction | null {
  const start = c.getFrom() === v;
  const p = routeEndPoint(c.getRenderingInformation(), start);
  if (!p) return null;

  const tol = 1.5;
  const distLeft = Math.abs(p.x - r.x);
  const distRight = Math.abs(p.x - (r.x + r.w));
  const distUp = Math.abs(p.y - r.y);
  const distDown = Math.abs(p.y - (r.y + r.h));
  const min = Math.min(distLeft, distRight, distUp, distDown);
  if (min > tol) {
    throw new LayoutCheckError(
      `connection ${c.getID()} should meet ${v.getID()}, cannot determine side`,
    );
  }
  if (min === distLeft) return Direction.LEFT;
  if (min === distRight) return Direction.RIGHT;
  if (min === distUp) return Direction.UP;
  return Direction.DOWN;
}

function connectionsOnSide(
  v: Connected,
  connectionSide: Direction,
  r: { x: number; y: number; w: number; h: number },
): number {
  let n = 0;
  for (const l of v.getLinks()) {
    try {
      if (getConnectionSide(l, v, r) === connectionSide) n++;
    } catch {
      // skip links that do not yet meet
    }
  }
  return n;
}

function isAligning(v: Connected, side: Direction): boolean {
  if (v.getType() === DiagramElementType.PORT) return false;
  const sizing = (
    v as Connected & { getSizing?: (h: boolean) => DiagramElementSizing }
  ).getSizing?.(
    side === Direction.LEFT || side === Direction.RIGHT,
  );
  if (sizing === DiagramElementSizing.MAXIMIZE) return false;
  return true;
}

function calculatePositionForPlacement(
  p: Placement,
  totalDist: number,
): number {
  const amount = p.amount;
  if (p.type === Measurement.PIXELS) {
    return amount < 0 ? totalDist + amount : amount;
  }
  return (totalDist * amount) / 100;
}

function getAlignPoint(
  s: number,
  len: number,
  v: Connected,
  connectionSide: Direction,
): number {
  const dim =
    connectionSide === Direction.LEFT || connectionSide === Direction.RIGHT
      ? Dimension.V
      : Dimension.H;
  const aligned = v as Connected & {
    getConnectionAlignment?: (d: Dimension) => Placement;
  };
  const p =
    aligned.getConnectionAlignment?.(dim) ??
    ({ type: Measurement.PERCENTAGE, amount: 50 } as Placement);
  return s + calculatePositionForPlacement(p, len);
}

/** Connections often cannot be centered when a directed layout runs through. */
function straightWithLayoutException(c: Connection, v: Connected): boolean {
  const container = v.getContainer?.();
  if (!container) return false;
  const l = container.getLayout();
  if (l != null && l !== Layout.GRID && c.getDrawDirection() != null) {
    return true;
  }
  return false;
}

/**
 * Straight orthogonal link locked to the peer's mid — the narrower end cannot
 * also be mid when left-aligned in the same band (ConnectionAlignment is TODO
 * in both Java compaction2 and TS). Treat as exempt like layout-through.
 */
function straightPeerMidException(
  c: Connection,
  v: Connected,
  p: { x: number; y: number },
  side: Direction,
): boolean {
  const other = c.getFrom() === v ? c.getTo() : c.getFrom();
  const otherBox = rectBox(other);
  if (!otherBox) return false;
  if (
    side === Direction.UP ||
    side === Direction.DOWN
  ) {
    const peerMid = otherBox.x + otherBox.w / 2;
    return Math.abs(p.x - peerMid) <= 2;
  }
  const peerMid = otherBox.y + otherBox.h / 2;
  return Math.abs(p.y - peerMid) <= 2;
}

function checkMidConnection(
  c: Connection,
  v: Connected,
  start: boolean,
): void {
  const rri = c.getRenderingInformation();
  const len = rri.getLength?.() ?? rri.routePositions?.length ?? 0;
  if (len === 0) return;

  const p = routeEndPoint(rri, start);
  const box = rectBox(v);
  if (!p || !box) return;

  if (!pointInExpandedRect(p.x, p.y, box)) {
    throw new LayoutCheckError(
      `connection ${c.getID()} doesn't meet ${v.getID()}`,
    );
  }

  const connectionSide = getConnectionSide(c, v, box);
  if (connectionSide == null) return;
  if (connectionsOnSide(v, connectionSide, box) !== 1) return;
  if (!isAligning(v, connectionSide)) return;

  const exempt =
    straightWithLayoutException(c, v) ||
    straightPeerMidException(c, v, p, connectionSide);

  if (
    connectionSide === Direction.UP ||
    connectionSide === Direction.DOWN
  ) {
    const alignPoint = getAlignPoint(box.x, box.w, v, connectionSide);
    if (Math.abs(p.x - alignPoint) > 2 && !exempt) {
      throw new LayoutCheckError(
        `${c.getID()} Not mid side of ${v.getID()}: box=${box.x},${box.y} ${box.w}x${box.h} p=${p.x},${p.y} align=${alignPoint} side=${connectionSide}`,
      );
    }
  } else {
    const alignPoint = getAlignPoint(box.y, box.h, v, connectionSide);
    if (Math.abs(p.y - alignPoint) > 2 && !exempt) {
      throw new LayoutCheckError(
        `${c.getID()} Not mid side of ${v.getID()}: box=${box.x},${box.y} ${box.w}x${box.h} p=${p.x},${p.y} align=${alignPoint} side=${connectionSide}`,
      );
    }
  }
}

/** Java `TestingEngine.testConnectionPresence`. */
function testConnectionPresence(
  c: Connection,
  rri: RouteRenderingInformation,
  checks: LayoutChecks,
): void {
  const linkTest = linkTestOf(c);
  if (rri.isContradicting) {
    if (checks.checkNoContradictions && linkTest !== "contradicting") {
      throw new LayoutCheckError(`Connection contradiction set: ${c.getID()}`);
    }
    return;
  }

  let dir: RouteDirectionResult;
  try {
    dir = getRouteDirection(rri);
  } catch (e) {
    throw new LayoutCheckError(
      `Could not find location of : ${c.getID()}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  if (dir === ROUTE_MULTIPLE) {
    if (checks.everythingStraight && linkTest !== "turn") {
      throw new LayoutCheckError(`Connection not straight: ${c.getID()}`);
    }
    // Multiple segments cannot equal a scalar drawDirection — edge-direction
    // is only meaningful for a single net direction (Java compares object
    // identity of MULTIPLE_DIRECTIONS and never matches a Direction).
  } else if (c.getDrawDirection() != null) {
    if (
      checks.checkEdgeDirections &&
      dir !== c.getDrawDirection() &&
      dir !== ROUTE_NONE
    ) {
      throw new LayoutCheckError(
        `Connection in wrong direction: ${c.getID()} ${c.getDrawDirection()} ${dir}`,
      );
    }
  }
}

function assertConnections(
  diagram: Diagram,
  layout: LayoutData,
  checks: LayoutChecks,
): void {
  const conns = connectionsOf(diagram);
  const missing: string[] = [];

  for (const c of conns) {
    if (isLayoutTemporary(c)) continue;

    const rri = c.getRenderingInformation();
    const len = rri.getLength?.() ?? rri.routePositions?.length ?? 0;
    const painted = layout.routes[c.getID()];
    const paintedLen = painted?.points?.length ?? 0;

    // Java TestingEngine.testConnectionPresence: empty route ⇒ ElementsMissingException
    if (len === 0 && paintedLen === 0) {
      missing.push(c.getID());
      continue;
    }

    if (checks.checkConnectionsMeetConnecteds) {
      // Compaction RI endpoints vs glyph RI boxes (Java TestingEngine.meets).
      if (len >= 2) {
        const fromBox = rectBox(c.getFrom());
        const toBox = rectBox(c.getTo());
        const first = routeEndPoint(rri, true);
        const last = routeEndPoint(rri, false);
        if (!fromBox) {
          throw new LayoutCheckError(
            `connection ${c.getID()} from ${c.getFrom().getID()} missing position/size`,
          );
        }
        if (!toBox) {
          throw new LayoutCheckError(
            `connection ${c.getID()} to ${c.getTo().getID()} missing position/size`,
          );
        }
        if (!first || !pointInExpandedRect(first.x, first.y, fromBox)) {
          throw new LayoutCheckError(
            `connection ${c.getID()} start does not meet ${c.getFrom().getID()}`,
          );
        }
        if (!last || !pointInExpandedRect(last.x, last.y, toBox)) {
          throw new LayoutCheckError(
            `connection ${c.getID()} end does not meet ${c.getTo().getID()}`,
          );
        }

        if (checks.checkMidConnection) {
          checkMidConnection(c, c.getFrom(), true);
          checkMidConnection(c, c.getTo(), false);
        }
      }

      // Painted SVG route must coincide with the connected's border box
      // (glyph boundary), not merely the placement cell.
      const fromId = c.getFrom().getID();
      const toId = c.getTo().getID();
      const fromCell = placementBox(layout, fromId);
      const toCell = placementBox(layout, toId);
      const stage = stageOf(diagram);
      const fromPaint = stage
        ? connectedPaintBox(c.getFrom(), stage)
        : null;
      const toPaint = stage ? connectedPaintBox(c.getTo(), stage) : null;
      const fromTarget = fromPaint ?? fromCell;
      const toTarget = toPaint ?? toCell;
      if (paintedLen >= 2) {
        const pts = painted!.points;
        const first = pts[0]!;
        const last = pts[pts.length - 1]!;
        if (
          fromTarget &&
          !pointInExpandedRect(first.x, first.y, fromTarget, 2)
        ) {
          throw new LayoutCheckError(
            `painted route ${c.getID()} start does not meet ${fromId}`,
          );
        }
        if (toTarget && !pointInExpandedRect(last.x, last.y, toTarget, 2)) {
          throw new LayoutCheckError(
            `painted route ${c.getID()} end does not meet ${toId}`,
          );
        }
      } else if (len >= 2 && fromCell && toCell) {
        throw new LayoutCheckError(
          `connection ${c.getID()} has RI route but no painted LayoutData.route`,
        );
      }
    }

    // Java TestingEngine.testHopCount: HopLink (`linkTest=hop`) may overlap.
    if (checks.checkNoHops && linkTestOf(c) !== "hop") {
      if (rri.hops?.some(Boolean)) {
        throw new LayoutCheckError(`Connection overlap on: ${c.getID()}`);
      }
      const pts = painted?.points;
      if (pts && pts.length >= 2) {
        const fromId = c.getFrom().getID();
        const toId = c.getTo().getID();
        for (const [id, p] of Object.entries(layout.placements)) {
          if (id === fromId || id === toId || !hasCell(p)) continue;
          const box = placementBox(layout, id);
          if (!box) continue;
          for (let i = 1; i < pts.length; i++) {
            if (segmentCrossesInterior(pts[i - 1]!, pts[i]!, box)) {
              throw new LayoutCheckError(
                `Connection overlap on: ${c.getID()} (through ${id})`,
              );
            }
          }
        }
      }
    }

    testConnectionPresence(c, rri, checks);
  }

  if (missing.length > 0) {
    throw new LayoutCheckError(
      `Diagram Elements not included [${missing.join(", ")}] missing`,
    );
  }
}

/**
 * Run functional layout checks (Java `TestingEngine.testDiagram` analogue).
 * Throws {@link LayoutCheckError} on the first failure.
 */
export function testDiagram(
  diagram: Diagram,
  layoutData: LayoutData,
  checks: LayoutChecks = defaultLayoutChecks(),
): void {
  assertLayoutData(layoutData, checks);
  assertDiagramLayout(diagram, checks);
  assertConnections(diagram, layoutData, checks);
}
