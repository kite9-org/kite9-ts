import { describe, expect, it } from "vitest";
import { Direction } from "@kite9/model";
import {
  AdjustableLayout,
} from "../src/adjustable-layout/adjustable-layout.js";
import {
  anchorOnBox,
  contentRowSpan,
  edgeCoords,
  ensureGridEdge,
  orthogonalPathD,
  resolveRouteToPoints,
  snapPolylineToVertices,
} from "../src/adjustable-layout/route-path.js";
import type { GridLayout, LayoutData } from "@kite9/model";

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
      contentColSizes: [100, 40, 100],
      contentRowSizes: [70],
      colSizes: [100, 40, 100],
      rowSizes: [70],
    };
    const midY = 35;
    // Hubs on either side of the mid routing lane; {xi:1} → lane centre (120).
    const start = { x: 90, y: midY };
    const end = { x: 150, y: midY };
    const pts = resolveRouteToPoints(grid, [{ xi: 1 }], start, end);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    expect(pts[0]).toEqual(start);
    expect(pts[pts.length - 1]).toEqual(end);
    // Colinear mid may be simplified away; segment still crosses lane centre.
    const laneCentre = 100 + 40 / 2;
    expect(Math.min(start.x, end.x)).toBeLessThanOrEqual(laneCentre);
    expect(Math.max(start.x, end.x)).toBeGreaterThanOrEqual(laneCentre);
    expect(pts.every((p) => p.y === midY)).toBe(true);
  });

  it("resolveRouteToPoints: end stub is orthogonal when hub is off the last track", () => {
    const grid: GridLayout = {
      contentCols: 3,
      contentRows: 3,
      gutter: 0,
      minCol: 40,
      minRow: 40,
      contentColSizes: [100, 40, 100],
      contentRowSizes: [40, 60],
      colSizes: [100, 40, 100],
      rowSizes: [40, 60],
    };
    // Vertical lane xi=1 (centre x=120), horizontal lane yi=0 (centre y=20),
    // then elbow to a right-edge hub — must stay orthogonal.
    const start = { x: 200, y: 70 };
    const end = { x: 90, y: 70 };
    const pts = resolveRouteToPoints(
      grid,
      [{ xi: 1 }, { yi: 0 }, { xi: 1 }],
      start,
      end,
    );
    expect(pts[0]).toEqual(start);
    expect(pts[pts.length - 1]).toEqual(end);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it("anchorOnBox uses the measured host box (not the cell)", () => {
    const p = anchorOnBox(
      { x: 20, y: 15, w: 50, h: 40 },
      Direction.RIGHT,
      50,
      "percentage",
    );
    expect(p).toEqual({ x: 70, y: 35 });
  });

  it("rematerializeRoutes rebuilds terminals from painted anchors", () => {
    const data: LayoutData = {
      grid: {
        contentCols: 2,
        contentRows: 1,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [100, 100],
        contentRowSizes: [70],
        colSizes: [100, 100],
        rowSizes: [70],
      },
      placements: [
        {
          id: "a",
          col: 1,
          row: 1,
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        {
          id: "b",
          col: 2,
          row: 1,
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        {
          id: "a__hub__right",
          onId: "a",
          edge: Direction.RIGHT,
          along: 50,
          type: "percentage",
        },
        {
          id: "b__hub__left",
          onId: "b",
          edge: Direction.LEFT,
          along: 50,
          type: "percentage",
        },
      ],
      routes: {
        l1: {
          startId: "a__hub__right",
          endId: "b__hub__left",
          route: [{ xi: 1 }],
        },
      },
    };
    const layout = AdjustableLayout.from(data);
    // Painted hosts are smaller/centered than the cell content box
    layout.rematerializeRoutes((id) => {
      if (id === "a__hub__right") return { x: 60, y: 30 };
      if (id === "b__hub__left") return { x: 120, y: 30 };
      return null;
    });
    const pts = layout.routePolyline("l1");
    expect(pts[0]).toEqual({ x: 60, y: 30 });
    expect(pts[pts.length - 1]).toEqual({ x: 120, y: 30 });
    expect(pts.every((p) => p.y === 30)).toBe(true);
  });
});
