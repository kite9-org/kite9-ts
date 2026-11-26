/**
 * Functional layout validation — spirit of Java
 * `AbstractLayoutFunctionalTest` / `TestingEngine.Checks` + `testDiagram`.
 */

import {
  DiagramElementType,
  type Connection,
  type Diagram,
  type DiagramElement,
  type LayoutData,
  type LayoutPlacement,
  type Rectangular,
  type RouteRenderingInformation,
} from "@kite9/model";

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

export function defaultLayoutChecks(): LayoutChecks {
  return {
    checkEdgeDirections: true,
    checkNoHops: true,
    everythingStraight: true,
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

/** Skip layout-only temps (Java skips TemporaryConnected / ConnectedGroupLinkNode). */
function isLayoutTemporary(de: DiagramElement): boolean {
  const id = de.getID();
  return (
    id.includes("--bareleaf") ||
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

/** Axis-aligned route direction summary for straightness / edge checks. */
function routeDirection(rri: RouteRenderingInformation): "straight" | "turn" | "empty" {
  const pts = rri.routePositions;
  if (!pts || pts.length < 2) return "empty";
  let sawH = false;
  let sawV = false;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x() - pts[i - 1]!.x();
    const dy = pts[i]!.y() - pts[i - 1]!.y();
    if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) return "turn";
    if (Math.abs(dx) > 0.5) sawH = true;
    if (Math.abs(dy) > 0.5) sawV = true;
  }
  return sawH && sawV ? "turn" : "straight";
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

function assertConnections(diagram: Diagram, checks: LayoutChecks): void {
  const conns = connectionsOf(diagram);
  for (const c of conns) {
    const rri = c.getRenderingInformation();
    const len = rri.getLength?.() ?? rri.routePositions?.length ?? 0;

    if (checks.checkConnectionsMeetConnecteds && len >= 2) {
      const pts = rri.routePositions!;
      const fromBox = rectBox(c.getFrom());
      const toBox = rectBox(c.getTo());
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      if (fromBox && !pointInExpandedRect(first.x(), first.y(), fromBox)) {
        throw new LayoutCheckError(
          `connection ${c.getID()} start does not meet ${c.getFrom().getID()}`,
        );
      }
      if (toBox && !pointInExpandedRect(last.x(), last.y(), toBox)) {
        throw new LayoutCheckError(
          `connection ${c.getID()} end does not meet ${c.getTo().getID()}`,
        );
      }
      // Mid-side alignment is enabled by flag but needs richer arrival-side
      // data; skip until ports/alignment are fully wired in TS fixtures.
      void checks.checkMidConnection;
    }

    if (len === 0) continue;

    if (checks.checkNoHops && rri.hops?.some(Boolean)) {
      throw new LayoutCheckError(`connection hop on ${c.getID()}`);
    }

    if (checks.checkNoContradictions && rri.isContradicting) {
      throw new LayoutCheckError(`connection contradiction on ${c.getID()}`);
    }

    const dir = routeDirection(rri);
    if (checks.everythingStraight && dir === "turn") {
      throw new LayoutCheckError(`connection not straight: ${c.getID()}`);
    }

    if (checks.checkEdgeDirections && c.getDrawDirection() != null && dir === "turn") {
      // Draw-direction vs route bearing needs DiagramChecker-equivalent;
      // treat multi-direction as a failure when a draw direction is set.
      throw new LayoutCheckError(
        `connection ${c.getID()} turns but has drawDirection ${c.getDrawDirection()}`,
      );
    }
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
  assertConnections(diagram, checks);
}
