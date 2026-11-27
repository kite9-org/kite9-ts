import type { LayoutData } from "@kite9/model";
import { describe, expect, it } from "vitest";
import { AdjustableLayout } from "../src/adjustable-layout/index.js";

function sampleLayout(): LayoutData {
  return {
    grid: {
      contentCols: 2,
      contentRows: 1,
      gutter: 0,
      minCol: 40,
      minRow: 40,
      contentColSizes: [100, 80],
      contentRowSizes: [60],
      colSizes: [100, 80],
      rowSizes: [60],
    },
    placements: [
      { id: "a", col: 1, row: 1, size: { w: 100, h: 60 } },
      { id: "b", col: 2, row: 1, size: { w: 80, h: 50 } },
    ],
    routes: {},
  };
}

describe("AdjustableLayout", () => {
  it("grows/shrinks only occupied content tracks", () => {
    const layout = AdjustableLayout.from(sampleLayout());

    expect(layout.resizeElement("a", { w: 140, h: 90 })).toBe(true);
    expect(layout.placements.a).toMatchObject({ size: { w: 140, h: 90 } });
    expect(layout.grid.contentColSizes[0]).toBe(140);
    expect(layout.grid.contentColSizes[1]).toBe(80);
    expect(layout.grid.contentRowSizes[0]).toBe(90);
    expect(layout.grid.colSizes).toEqual([140, 80]);
    expect(layout.grid.rowSizes).toEqual([90]);

    expect(layout.resizeElement("a", { w: 70, h: 45 })).toBe(true);
    expect(layout.grid.contentColSizes[0]).toBe(70);
    // Row held by b (h:50)
    expect(layout.grid.contentRowSizes[0]).toBe(50);
    expect(layout.grid.colSizes).toEqual([70, 80]);
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
      },
      placements: [
        {
          id: "a",
          col: 2,
          row: 2,
          size: { w: 35, h: 41 },
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        {
          id: "b",
          col: 2,
          row: 3,
          size: { w: 35, h: 41 },
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
        { id: "stack", col: 1, row: 1, colEnd: 3, rowEnd: 4 },
        {
          id: "side",
          col: 4,
          row: 1,
          rowEnd: 4,
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
      ],
    });

    expect(layout.resizeElement("a", { w: 55, h: 61 })).toBe(true);
    expect(layout.grid.contentColSizes).toEqual([12, 75, 12, 72]);
    expect(layout.grid.contentRowSizes[0]).toBe(12);
    expect(layout.grid.contentRowSizes[1]).toBe(81);
  });

  it("setMargin / clearMargin update occupancy tracks", () => {
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
      },
      placements: [
        {
          id: "a",
          col: 2,
          row: 2,
          size: { w: 35, h: 41 },
        },
        { id: "stack", col: 1, row: 1, colEnd: 3, rowEnd: 4 },
      ],
    });

    expect(
      layout.setMargin("a", { top: 10, right: 10, bottom: 10, left: 10 }),
    ).toBe(true);
    expect(layout.placements.a).toMatchObject({
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    });
    expect(layout.clearMargin("a")).toBe(true);
    expect(layout.placements.a && "margin" in layout.placements.a).toBe(false);
  });

  it("toJSON round-trips placements as an array", () => {
    const source = sampleLayout();
    const layout = AdjustableLayout.from(source);
    layout.resizeElement("a", { w: 110, h: 60 });
    const json = layout.toJSON();
    expect(Array.isArray(json.placements)).toBe(true);
    expect(json.placements.find((p) => p.id === "a")).toMatchObject({
      size: { w: 110, h: 60 },
    });
    expect(source.placements.find((p) => p.id === "a")).toMatchObject({
      size: { w: 100, h: 60 },
    });
  });
});
