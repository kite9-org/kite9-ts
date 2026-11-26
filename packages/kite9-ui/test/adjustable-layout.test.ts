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
