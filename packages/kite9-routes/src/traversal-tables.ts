/** Content-cell H/V traversability from placement borders + getTraversalRule. */

import { BorderTraversal, Direction } from "@kite9/css";
import type {
  Diagram,
  DiagramElement,
  LayoutData,
  LayoutPlacement,
  Rectangular,
  RectangularConnectedLayoutPlacement,
} from "@kite9/model";

export type TraversalTables = {
  /** contentRows × contentCols; `[row-1][col-1]` for content cell (col, row). */
  horizontal: boolean[][];
  /** contentRows × contentCols; `[row-1][col-1]` for content cell (col, row). */
  vertical: boolean[][];
};

function isRect(
  p: LayoutPlacement,
): p is RectangularConnectedLayoutPlacement {
  return "col" in p && "row" in p;
}

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

/** Walk the diagram and index rectangulars by id. */
export function indexRectangulars(diagram: Diagram): Map<string, Rectangular> {
  const out = new Map<string, Rectangular>();
  const walk = (el: DiagramElement) => {
    if (isRectangular(el)) {
      out.set(el.getID(), el);
      for (const c of el.getContents()) walk(c);
    }
  };
  walk(diagram);
  return out;
}

function makeGrid(rows: number, cols: number, fill: boolean): boolean[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill),
  );
}

/**
 * Build H/V traversal tables over content cells.
 * Empty cells start traversable; a `PREVENT` border on a rectangular clears
 * the matching axis for every content cell along that border.
 */
export function buildTraversalTables(
  diagram: Diagram,
  layout: LayoutData,
): TraversalTables {
  const { contentCols, contentRows } = layout.grid;
  const horizontal = makeGrid(contentRows, contentCols, true);
  const vertical = makeGrid(contentRows, contentCols, true);
  const byId = indexRectangulars(diagram);

  for (const p of layout.placements) {
    if (!isRect(p)) continue;
    const el = byId.get(p.id);
    if (!el) continue;

    const c0 = p.col;
    const c1 = p.colEnd ?? p.col;
    const r0 = p.row;
    const r1 = p.rowEnd ?? p.row;

    const clearH = (col: number, rowFrom: number, rowTo: number) => {
      for (let r = rowFrom; r <= rowTo; r++) {
        const cell = horizontal[r - 1]?.[col - 1];
        if (cell !== undefined) horizontal[r - 1]![col - 1] = false;
      }
    };
    const clearV = (row: number, colFrom: number, colTo: number) => {
      for (let c = colFrom; c <= colTo; c++) {
        const cell = vertical[row - 1]?.[c - 1];
        if (cell !== undefined) vertical[row - 1]![c - 1] = false;
      }
    };

    if (el.getTraversalRule(Direction.LEFT) === BorderTraversal.PREVENT) {
      clearH(c0, r0, r1);
    }
    if (el.getTraversalRule(Direction.RIGHT) === BorderTraversal.PREVENT) {
      clearH(c1, r0, r1);
    }
    if (el.getTraversalRule(Direction.UP) === BorderTraversal.PREVENT) {
      clearV(r0, c0, c1);
    }
    if (el.getTraversalRule(Direction.DOWN) === BorderTraversal.PREVENT) {
      clearV(r1, c0, c1);
    }
  }

  return { horizontal, vertical };
}

/** True if content cell `(col, row)` (1-based) allows horizontal stub travel. */
export function canTraverseHorizontal(
  tables: TraversalTables,
  col: number,
  row: number,
): boolean {
  return tables.horizontal[row - 1]?.[col - 1] ?? false;
}

/** True if content cell `(col, row)` (1-based) allows vertical stub travel. */
export function canTraverseVertical(
  tables: TraversalTables,
  col: number,
  row: number,
): boolean {
  return tables.vertical[row - 1]?.[col - 1] ?? false;
}
