import { describe, expect, it } from "vitest";
import {
  contentRowSpan,
  edgeCoords,
  ensureGridEdge,
  initContentSpans,
  orthogonalPathD,
  snapPolylineToVertices,
} from "../src/adjustable-layout/route-path.js";
import type { GridLayout } from "@kite9/model";

function sampleGrid(): GridLayout {
  return {
    contentCols: 3,
    contentRows: 1,
    gutter: 16,
    minCol: 40,
    minRow: 40,
    contentColSizes: [52, 55, 53],
    contentRowSizes: [41],
    colSizes: [16, 16, 52, 16, 55, 16, 53, 16, 16],
    rowSizes: [16, 16, 41, 16, 16],
  };
}

describe("route-path", () => {
  it("snapPolylineToVertices keeps a horizontal span as two edges", () => {
    const v = snapPolylineToVertices(sampleGrid(), [
      { x: 72, y: 30 },
      { x: 67, y: 30 },
      { x: 62, y: 30 },
    ]);
    expect(v.length).toBe(2);
    expect(v[0]).toEqual({ xi: 3, yi: 2 });
    expect(v[1]).toEqual({ xi: 2, yi: 2 });
  });

  it("ensureGridEdge splits a content row for a mid-glyph lane", () => {
    const grid = sampleGrid();
    initContentSpans(grid);
    const yi = ensureGridEdge(grid, "row", 38);
    expect(edgeCoords(grid.rowSizes)).toContain(38);
    expect(yi).toBe(3);
    expect(contentRowSpan(grid, 1)).toEqual({ start: 2, count: 2 });
    const v = snapPolylineToVertices(grid, [
      { x: 84, y: 38 },
      { x: 100, y: 38 },
    ]);
    expect(v[0]?.yi).toBe(3);
    expect(v[1]?.yi).toBe(3);
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
});
