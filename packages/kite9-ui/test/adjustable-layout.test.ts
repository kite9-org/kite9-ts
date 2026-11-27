import type { LayoutData } from "@kite9/model";
import { describe, expect, it } from "vitest";
import { AdjustableLayout } from "../src/adjustable-layout/index.js";

function sampleLayout(): LayoutData {
  return {
    grid: {
      contentCols: 2,
      contentRows: 1,
      gutter: 16,
      minCol: 40,
      minRow: 40,
      contentColSizes: [100, 80],
      contentRowSizes: [60],
      // Outer pads 16, inter-content gutter 16 — must be preserved on resize
      colSizes: [16, 16, 100, 16, 80, 16, 16],
      rowSizes: [16, 16, 60, 16, 16],
    },
    placements: {
      a: { col: 1, row: 1, size: { w: 100, h: 60 } },
      b: { col: 2, row: 1, size: { w: 80, h: 50 } },
    },
    routes: {},
  };
}

describe("AdjustableLayout", () => {
  it("grows/shrinks only occupied content tracks; keeps gutters", () => {
    const layout = AdjustableLayout.from(sampleLayout());

    expect(layout.resizeElement("a", { w: 140, h: 90 })).toBe(true);
    expect(layout.placements.a).toMatchObject({ size: { w: 140, h: 90 } });
    expect(layout.grid.contentColSizes[0]).toBe(140);
    expect(layout.grid.contentColSizes[1]).toBe(80); // untouched
    expect(layout.grid.contentRowSizes[0]).toBe(90);
    expect(layout.grid.colSizes).toEqual([16, 16, 140, 16, 80, 16, 16]);
    expect(layout.grid.rowSizes).toEqual([16, 16, 90, 16, 16]);

    expect(layout.resizeElement("a", { w: 70, h: 45 })).toBe(true);
    expect(layout.grid.contentColSizes[0]).toBe(70);
    // Row held by b (h:50)
    expect(layout.grid.contentRowSizes[0]).toBe(50);
    expect(layout.grid.colSizes).toEqual([16, 16, 70, 16, 80, 16, 16]);
    expect(layout.grid.colSizes[0]).toBe(16);
    expect(layout.grid.colSizes[3]).toBe(16);
  });

  it("growToFit expands parent without shrinking", () => {
    const layout = AdjustableLayout.from(sampleLayout());
    expect(layout.growToFit("a", { w: 90, h: 50 })).toBe(true);
    expect(layout.placements.a).toMatchObject({ size: { w: 100, h: 60 } });
    expect(layout.growToFit("a", { w: 130, h: 60 })).toBe(true);
    expect(layout.placements.a).toMatchObject({ size: { w: 130, h: 60 } });
    expect(layout.grid.contentColSizes[0]).toBe(130);
  });

  it("multi-span resize grows leaf tracks only — nested padding stays fixed", () => {
    // Flattened nest: pad | leaf | pad | side  (gutter 0, pads are content tracks)
    const layout = AdjustableLayout.from({
      grid: {
        contentCols: 4,
        contentRows: 4,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [12, 55, 12, 72],
        contentRowSizes: [12, 61, 61, 12],
        colSizes: [12, 55, 12, 72],
        rowSizes: [12, 61, 61, 12],
        contentColStarts: [0, 1, 2, 3],
        contentRowStarts: [0, 1, 2, 3],
      },
      placements: {
        a: {
          col: 2,
          row: 2,
          size: { w: 35, h: 41 },
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        b: {
          col: 2,
          row: 3,
          size: { w: 35, h: 41 },
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        stack: { col: 1, row: 1, colEnd: 3, rowEnd: 4 },
        side: {
          col: 4,
          row: 1,
          rowEnd: 4,
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
      },
    });

    expect(layout.resizeElement("a", { w: 55, h: 61 })).toBe(true);
    // Occupied 75×81 — only leaf col/row 2 grow; pads untouched
    expect(layout.grid.contentColSizes).toEqual([12, 75, 12, 72]);
    expect(layout.grid.contentRowSizes[0]).toBe(12);
    expect(layout.grid.contentRowSizes[1]).toBe(81);
    expect(layout.grid.contentRowSizes[3]).toBe(12);

    // Multi-span stack resize must not inflate padding tracks
    expect(
      layout.resizeElement("stack", { w: 120, h: 200 }),
    ).toBe(true);
    expect(layout.grid.contentColSizes[0]).toBe(12);
    expect(layout.grid.contentColSizes[2]).toBe(12);
    expect(layout.grid.contentColSizes[1]).toBeGreaterThanOrEqual(75);
    expect(layout.grid.contentRowSizes[0]).toBe(12);
    expect(layout.grid.contentRowSizes[3]).toBe(12);
  });

  it("multi-span resize finds leaf tracks even without placement.size", () => {
    const layout = AdjustableLayout.from({
      grid: {
        contentCols: 4,
        contentRows: 4,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [12, 55, 12, 72],
        contentRowSizes: [12, 61, 61, 12],
        colSizes: [12, 55, 12, 72],
        rowSizes: [12, 61, 61, 12],
        contentColStarts: [0, 1, 2, 3],
        contentRowStarts: [0, 1, 2, 3],
      },
      placements: {
        // Content-sized leaves (no size) — still mark col/row 2–3 as flex
        a: { col: 2, row: 2 },
        b: { col: 2, row: 3 },
        stack: { col: 1, row: 1, colEnd: 3, rowEnd: 4 },
        side: { col: 4, row: 1, rowEnd: 4 },
      },
    });

    expect(layout.resizeElement("stack", { w: 99, h: 166 })).toBe(true);
    expect(layout.grid.contentColSizes).toEqual([12, 75, 12, 72]);
    expect(layout.grid.contentRowSizes[0]).toBe(12);
    expect(layout.grid.contentRowSizes[3]).toBe(12);
    expect(
      (layout.grid.contentRowSizes[1] ?? 0) + (layout.grid.contentRowSizes[2] ?? 0),
    ).toBe(142); // 166 - 12 - 12
  });

  it("respects grid.minWidth / minHeight when shrinking content", () => {
    const source = sampleLayout();
    // Physical width = 16+16+100+16+80+16+16 = 260
    source.grid.minWidth = 260;
    source.grid.minHeight = 124; // 16+16+60+16+16
    const layout = AdjustableLayout.from(source);

    expect(layout.resizeElement("a", { w: 50, h: 40 })).toBe(true);
    // Content col for `a` would want 50, but minWidth keeps total ≥ 260
    const colSum = layout.grid.colSizes.reduce((a, b) => a + b, 0);
    const rowSum = layout.grid.rowSizes.reduce((a, b) => a + b, 0);
    expect(colSum).toBeGreaterThanOrEqual(260);
    expect(rowSum).toBeGreaterThanOrEqual(124);
    // Pads/gutters unchanged
    expect(layout.grid.colSizes[0]).toBe(16);
    expect(layout.grid.colSizes[3]).toBe(16);
  });

  it("setMargin records insets and grows tracks by occupied size", () => {
    const layout = AdjustableLayout.from(sampleLayout());
    expect(
      layout.setMargin("a", {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
      }),
    ).toBe(true);

    const a = layout.placements.a;
    expect(a).toMatchObject({
      size: { w: 100, h: 60 },
      margin: { top: 10, right: 20, bottom: 10, left: 20 },
    });
    expect(a && "size" in a && AdjustableLayout.occupiedSize(a)).toEqual({
      w: 140,
      h: 80,
    });
    expect(layout.grid.contentColSizes[0]).toBe(140);
    expect(layout.grid.contentRowSizes[0]).toBe(80);
    expect(layout.grid.colSizes).toEqual([16, 16, 140, 16, 80, 16, 16]);
    expect(layout.grid.rowSizes).toEqual([16, 16, 80, 16, 16]);
  });

  it("asymmetric margins occupy tracks without changing content size", () => {
    const layout = AdjustableLayout.from(sampleLayout());
    expect(
      layout.setMargin("a", {
        top: 5,
        right: 30,
        bottom: 15,
        left: 0,
      }),
    ).toBe(true);

    const a = layout.placements.a;
    expect(a).toMatchObject({ size: { w: 100, h: 60 } });
    expect(a && "size" in a && AdjustableLayout.occupiedSize(a)).toEqual({
      w: 130, // 100 + 0 + 30
      h: 80, // 60 + 5 + 15
    });
    expect(layout.grid.contentColSizes[0]).toBe(130);
    expect(layout.grid.contentRowSizes[0]).toBe(80);
  });

  it("clearMargin drops insets and recomputes tracks", () => {
    const layout = AdjustableLayout.from(sampleLayout());
    layout.setMargin("a", { top: 10, right: 20, bottom: 10, left: 20 });
    expect(layout.clearMargin("a")).toBe(true);

    const a = layout.placements.a;
    expect(a && "margin" in a ? a.margin : undefined).toBeUndefined();
    expect(a && "size" in a && AdjustableLayout.occupiedSize(a)).toEqual({
      w: 100,
      h: 60,
    });
    expect(layout.grid.contentColSizes[0]).toBe(100);
    // Row still held by b (h:50) and a (h:60) → 60
    expect(layout.grid.contentRowSizes[0]).toBe(60);
  });

  it("resizeElement keeps margins and sizes tracks by occupied size", () => {
    const layout = AdjustableLayout.from(sampleLayout());
    layout.setMargin("a", { top: 4, right: 8, bottom: 4, left: 8 });
    expect(layout.resizeElement("a", { w: 120, h: 70 })).toBe(true);

    const a = layout.placements.a;
    expect(a).toMatchObject({
      size: { w: 120, h: 70 },
      margin: { top: 4, right: 8, bottom: 4, left: 8 },
    });
    expect(a && "size" in a && AdjustableLayout.occupiedSize(a)).toEqual({
      w: 136,
      h: 78,
    });
    expect(layout.grid.contentColSizes[0]).toBe(136);
    expect(layout.grid.contentRowSizes[0]).toBe(78);
  });

  it("from deep-clones so fixture data is not mutated", () => {
    const source = sampleLayout();
    const layout = AdjustableLayout.from(source);
    layout.resizeElement("a", { w: 200, h: 100 });
    layout.setMargin("a", { top: 1, right: 2, bottom: 3, left: 4 });
    expect(source.placements.a).toMatchObject({ size: { w: 100, h: 60 } });
    expect(source.placements.a && "margin" in source.placements.a).toBe(false);
    expect(source.grid.contentColSizes[0]).toBe(100);
  });
});
