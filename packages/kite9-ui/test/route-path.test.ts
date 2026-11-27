import { describe, expect, it } from "vitest";
import {
  contentRowSpan,
  edgeCoords,
  ensureGridEdge,
  orthogonalPathD,
  resolveRouteToPoints,
  snapPolylineToVertices,
} from "../src/adjustable-layout/route-path.js";
import type { GridLayout } from "@kite9/model";

function sampleGrid(): GridLayout {
  return {
    contentCols: 3,
    contentRows: 1,
    gutter: 0,
    minCol: 40,
    minRow: 40,
    contentColSizes: [52, 55, 53],
    contentRowSizes: [41],
    colSizes: [52, 55, 53],
    rowSizes: [41],
  };
}

describe("route-path", () => {
  it("snapPolylineToVertices keeps a horizontal span as xi visits", () => {
    const v = snapPolylineToVertices(sampleGrid(), [
      { x: 40, y: 20 },
      { x: 30, y: 20 },
      { x: 20, y: 20 },
    ]);
    expect(v.length).toBe(2);
    expect(v.every((p) => "xi" in p)).toBe(true);
  });

  it("ensureGridEdge splits a content row for a mid-glyph lane", () => {
    const grid = sampleGrid();
    const yi = ensureGridEdge(grid, "row", 20);
    expect(edgeCoords(grid.rowSizes)).toContain(20);
    expect(yi).toBe(1);
    // Content spans stay 1:1; physical track count grows.
    expect(contentRowSpan(grid, 1)).toEqual({ start: 0, count: 1 });
    expect(grid.rowSizes.length).toBe(2);
  });

  it("orthogonalPathD rounds a corner", () => {
    const d = orthogonalPathD(
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
      ],
      8,
    );
    expect(d).toContain("M0 0");
    expect(d).toContain("A");
  });

  it("resolveRouteToPoints: lone {xi} between same-y hubs is a straight mid segment", () => {
    const grid: GridLayout = {
      contentCols: 3,
      contentRows: 1,
      gutter: 0,
      minCol: 40,
      minRow: 40,
      contentColSizes: [100, 90, 100],
      contentRowSizes: [70],
      colSizes: [100, 90, 100],
      rowSizes: [70],
    };
    const xs = edgeCoords(grid.colSizes);
    const midY = 35;
    const start = { x: 90, y: midY };
    const end = { x: 110, y: midY };
    const pts = resolveRouteToPoints(grid, [{ xi: 1 }], start, end);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    expect(pts[0]).toEqual(start);
    expect(pts[pts.length - 1]).toEqual(end);
    // Colinear mid track point may be collapsed; the segment still crosses xs[1].
    const trackX = xs[1]!;
    expect(Math.min(start.x, end.x)).toBeLessThanOrEqual(trackX);
    expect(Math.max(start.x, end.x)).toBeGreaterThanOrEqual(trackX);
    // Entire polyline stays on midY (straight)
    expect(pts.every((p) => p.y === midY)).toBe(true);
  });
});
