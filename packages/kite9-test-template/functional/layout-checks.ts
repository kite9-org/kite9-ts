/**
 * Grid-oriented functional checks (subset of layout TestingEngine checks).
 * No hop / straightness / connection routing assertions.
 */

import {
  DiagramElementType,
  Layout,
  type Diagram,
  type DiagramElement,
  type LayoutData,
  type LayoutPlacement,
  type Rectangular,
} from "@kite9/model";

export type LayoutChecks = {
  checkLayout: boolean;
  checkOcclusion: boolean;
  /** When true, overlapping cells are allowed if one fully contains the other. */
  allowContainedOverlap: boolean;
};

export function defaultLayoutChecks(
  kind:
    | "display"
    | "layout"
    | "thorough"
    | "performance"
    | "grid"
    | "routes" = "grid",
): LayoutChecks {
  return {
    checkLayout: true,
    checkOcclusion: true,
    allowContainedOverlap: kind === "grid" || kind === "routes",
  };
}

export class LayoutCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayoutCheckError";
  }
}

function hasCell(
  p: LayoutPlacement,
): p is Extract<LayoutPlacement, { col: number; row: number }> {
  return "col" in p && "row" in p;
}

function placementEntries(
  layout: LayoutData,
): [string, LayoutPlacement][] {
  return layout.placements.map((p) => [p.id, p]);
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

function fullyContains(
  outer: ReturnType<typeof cellSpan>,
  inner: ReturnType<typeof cellSpan>,
): boolean {
  return (
    outer.c0 <= inner.c0 &&
    outer.c1 >= inner.c1 &&
    outer.r0 <= inner.r0 &&
    outer.r1 >= inner.r1
  );
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
    for (const [id, p] of placementEntries(layout)) {
      if (!hasCell(p)) continue;
      if (p.size && !(p.size.w > 0 && p.size.h > 0)) {
        throw new LayoutCheckError(
          `placement ${id} has non-positive size ${p.size.w}×${p.size.h}`,
        );
      }
      const span = cellSpan(p);
      if (
        span.c0 < 1 ||
        span.c1 > contentCols ||
        span.r0 < 1 ||
        span.r1 > contentRows
      ) {
        throw new LayoutCheckError(
          `placement ${id} cell ${span.c0}-${span.c1},${span.r0}-${span.r1} outside ${contentCols}×${contentRows}`,
        );
      }
    }
  }

  if (checks.checkOcclusion) {
    const cells = placementEntries(layout).filter(([, p]) =>
      hasCell(p),
    ) as [string, Extract<LayoutPlacement, { col: number }>][];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const [idA, a] = cells[i]!;
        const [idB, b] = cells[j]!;
        const sa = cellSpan(a);
        const sb = cellSpan(b);
        if (!cellsOverlap(sa, sb)) continue;
        if (
          checks.allowContainedOverlap &&
          (fullyContains(sa, sb) || fullyContains(sb, sa))
        ) {
          continue;
        }
        throw new LayoutCheckError(
          `placements overlap in grid: ${idA} and ${idB}`,
        );
      }
    }
  }
}

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function isConnected(de: DiagramElement): boolean {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
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
  if (x1 + w1 > x2 + 0.5) {
    throw new LayoutCheckError(
      `Was expecting ${prev.getID()} before ${cc.getID()} ${l}`,
    );
  }
}

function paintBox(de: DiagramElement): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const host = (de as { el?: Element }).el as HTMLElement | undefined;
  if (!host || typeof host.getBoundingClientRect !== "function") return null;
  const r = host.getBoundingClientRect();
  if (!(r.width > 0 || r.height > 0)) return null;
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}

function checkLayoutOrder(d: Rectangular, l: Layout): void {
  let prev: DiagramElement | null = null;
  for (const c of d.getContents()) {
    if (!isConnected(c)) continue;
    if (prev != null) {
      const a = paintBox(prev);
      const b = paintBox(c);
      if (a && b) {
        switch (l) {
          case Layout.RIGHT:
            checkBefore(a.x, a.w, b.x, b.w, prev, c, l);
            break;
          case Layout.LEFT:
            checkBefore(b.x, b.w, a.x, a.w, c, prev, l);
            break;
          case Layout.DOWN:
            checkBefore(a.y, a.h, b.y, b.h, prev, c, l);
            break;
          case Layout.UP:
            checkBefore(b.y, b.h, a.y, a.h, c, prev, l);
            break;
          default:
            break;
        }
      }
    }
    prev = c;
  }
}

function boxWithin(
  inner: { x: number; y: number; w: number; h: number },
  outer: { x: number; y: number; w: number; h: number },
  eps = 1,
): boolean {
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.w <= outer.x + outer.w + eps &&
    inner.y + inner.h <= outer.y + outer.h + eps
  );
}

/**
 * Every connected paint box must sit inside its rectangular parent (or the
 * diagram). Catches track undersizing / paint overflow that JSON equality misses.
 */
function assertPaintContainment(diagram: Diagram): void {
  const walk = (parent: Rectangular) => {
    const outer = paintBox(parent);
    for (const c of parent.getContents()) {
      if (isConnected(c)) {
        const inner = paintBox(c);
        if (inner && outer && outer.w > 0 && outer.h > 0) {
          if (!boxWithin(inner, outer)) {
            throw new LayoutCheckError(
              `${c.getID()} not entirely within ${parent.getID()} ` +
                `(${Math.round(inner.w)}×${Math.round(inner.h)} @ ` +
                `${Math.round(inner.x - outer.x)},${Math.round(inner.y - outer.y)} ` +
                `vs parent ${Math.round(outer.w)}×${Math.round(outer.h)})`,
            );
          }
        }
      }
      if (isRectangular(c)) walk(c);
    }
  };
  walk(diagram);
}

/**
 * Placement border-box + margins must fit the content cell(s) they occupy.
 */
function assertPlacementsFitCells(
  diagram: Diagram,
  layoutData: LayoutData,
): void {
  const root = (diagram as { el?: HTMLElement }).el;
  if (!root || typeof root.getBoundingClientRect !== "function") return;
  // Cell coords are relative to the objects-layer grid, not the host (stage
  // border would otherwise shift every check by 1px and false-fail equals).
  const objects =
    root.shadowRoot?.querySelector(".objects-layer") ??
    root.shadowRoot?.querySelector(".stage") ??
    root;
  const origin = (objects as HTMLElement).getBoundingClientRect();
  const { grid } = layoutData;
  const xs = [0];
  let sx = 0;
  for (const w of grid.colSizes) {
    sx += w;
    xs.push(sx);
  }
  const ys = [0];
  let sy = 0;
  for (const h of grid.rowSizes) {
    sy += h;
    ys.push(sy);
  }

  for (const [id, p] of placementEntries(layoutData)) {
    if (!hasCell(p)) continue;
    const de = diagram.getElementById?.(id) ?? findById(diagram, id);
    if (!de) continue;
    const painted = paintBox(de);
    if (!painted) continue;

    const col0 = p.col - 1;
    const col1 = (p.colEnd ?? p.col) - 1;
    const row0 = p.row - 1;
    const row1 = (p.rowEnd ?? p.row) - 1;
    // 1:1 content → physical tracks (no pad lattice / contentColStarts).
    const startCol = col0;
    const endCol = col1 + 1;
    const startRow = row0;
    const endRow = row1 + 1;

    const cell = {
      x: origin.x + (xs[startCol] ?? 0),
      y: origin.y + (ys[startRow] ?? 0),
      w: Math.max(0, (xs[endCol] ?? 0) - (xs[startCol] ?? 0)),
      h: Math.max(0, (ys[endRow] ?? 0) - (ys[startRow] ?? 0)),
    };

    const margin = "margin" in p ? p.margin : undefined;
    const occupied = {
      x: painted.x - (margin?.left ?? 0),
      y: painted.y - (margin?.top ?? 0),
      w: painted.w + (margin?.left ?? 0) + (margin?.right ?? 0),
      h: painted.h + (margin?.top ?? 0) + (margin?.bottom ?? 0),
    };

    if (!boxWithin(occupied, cell)) {
      throw new LayoutCheckError(
        `${id} occupied ${Math.round(occupied.w)}×${Math.round(occupied.h)} ` +
          `does not fit cell ${Math.round(cell.w)}×${Math.round(cell.h)}`,
      );
    }
  }
}

function findById(diagram: Diagram, id: string): DiagramElement | null {
  const walk = (r: Rectangular): DiagramElement | null => {
    for (const c of r.getContents()) {
      if (c.getID() === id) return c;
      if (isRectangular(c)) {
        const found = walk(c);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(diagram);
}

function assertDiagramLayout(diagram: Diagram, checks: LayoutChecks): void {
  if (!checks.checkLayout) return;
  const walk = (r: Rectangular) => {
    const layout = r.getLayout?.() ?? null;
    if (
      layout === Layout.LEFT ||
      layout === Layout.RIGHT ||
      layout === Layout.UP ||
      layout === Layout.DOWN
    ) {
      checkLayoutOrder(r, layout);
    }
    for (const c of r.getContents()) {
      if (isRectangular(c)) walk(c);
    }
  };
  walk(diagram);
}

/**
 * Run grid-oriented layout checks. Throws {@link LayoutCheckError} on failure.
 */
export function testDiagram(
  diagram: Diagram,
  layoutData: LayoutData,
  checks: LayoutChecks = defaultLayoutChecks(),
): void {
  assertLayoutData(layoutData, checks);
  assertDiagramLayout(diagram, checks);
  if (checks.checkLayout) {
    assertPaintContainment(diagram);
    assertPlacementsFitCells(diagram, layoutData);
  }
}
