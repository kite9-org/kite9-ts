import { BorderTraversal, Direction } from "@kite9/css";
import type { Diagram, LayoutData, Rectangular } from "@kite9/model";
import { DiagramElementType, Layout } from "@kite9/model";
import { describe, expect, it } from "vitest";
import {
  buildTraversalTables,
  canTraverseHorizontal,
  canTraverseVertical,
} from "../src/traversal-tables.js";

type TraversalMap = Partial<Record<Direction, BorderTraversal>>;

function mockRect(
  id: string,
  traversal: TraversalMap | BorderTraversal,
  contents: Rectangular[] = [],
): Rectangular {
  const rule =
    typeof traversal === "string"
      ? () => traversal
      : (d: Direction) => traversal[d] ?? BorderTraversal.ALWAYS;

  return {
    getID: () => id,
    getType: () => DiagramElementType.CONNECTED_RECTANGULAR,
    getParent: () => null,
    getDepth: () => 1,
    getContainer: () => null,
    getContents: () => contents,
    addTemporaryContent: () => {},
    getTraversalRule: rule,
    getLayout: () => (contents.length ? Layout.RIGHT : null),
    getGridColumns: () => 0,
    getGridRows: () => 0,
    deepContains: () => false,
    getRenderingInformation: () => ({}) as never,
    getContainerPosition: () => null,
    compareTo: () => 0,
  } as unknown as Rectangular;
}

function mockDiagram(children: Rectangular[]): Diagram {
  const root = mockRect("diagram", BorderTraversal.ALWAYS, children);
  return {
    ...root,
    getType: () => DiagramElementType.DIAGRAM,
    getConnectionsFor: () => [],
  } as unknown as Diagram;
}

describe("buildTraversalTables", () => {
  it("marks PREVENT glyph cells blocked; empty and ALWAYS container stay open", () => {
    // 3×2 grid: glyph at (1,1), empty (2,1), container span (3,1)-(3,2) ALWAYS
    const layout: LayoutData = {
      grid: {
        contentCols: 3,
        contentRows: 2,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [40, 40, 40],
        contentRowSizes: [40, 40],
        colSizes: [40, 40, 40],
        rowSizes: [40, 40],
      },
      placements: [
        { id: "g1", col: 1, row: 1 },
        { id: "c1", col: 3, row: 1, colEnd: 3, rowEnd: 2 },
      ],
    };

    const diagram = mockDiagram([
      mockRect("g1", BorderTraversal.PREVENT),
      mockRect("c1", BorderTraversal.ALWAYS),
    ]);

    const tables = buildTraversalTables(diagram, layout);

    // Glyph: all four PREVENT borders clear H and V on its cell
    expect(canTraverseHorizontal(tables, 1, 1)).toBe(false);
    expect(canTraverseVertical(tables, 1, 1)).toBe(false);

    // Empty cell
    expect(canTraverseHorizontal(tables, 2, 1)).toBe(true);
    expect(canTraverseVertical(tables, 2, 1)).toBe(true);
    expect(canTraverseHorizontal(tables, 2, 2)).toBe(true);
    expect(canTraverseVertical(tables, 2, 2)).toBe(true);

    // ALWAYS container — still open
    expect(canTraverseHorizontal(tables, 3, 1)).toBe(true);
    expect(canTraverseVertical(tables, 3, 1)).toBe(true);
    expect(canTraverseHorizontal(tables, 3, 2)).toBe(true);
    expect(canTraverseVertical(tables, 3, 2)).toBe(true);
  });

  it("only clears the axis matching a PREVENT border", () => {
    const layout: LayoutData = {
      grid: {
        contentCols: 2,
        contentRows: 2,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [40, 40],
        contentRowSizes: [40, 40],
        colSizes: [40, 40],
        rowSizes: [40, 40],
      },
      placements: [{ id: "g", col: 1, row: 1, colEnd: 2, rowEnd: 1 }],
    };

    const diagram = mockDiagram([
      mockRect("g", {
        [Direction.LEFT]: BorderTraversal.PREVENT,
        [Direction.RIGHT]: BorderTraversal.ALWAYS,
        [Direction.UP]: BorderTraversal.ALWAYS,
        [Direction.DOWN]: BorderTraversal.ALWAYS,
      }),
    ]);

    const tables = buildTraversalTables(diagram, layout);

    // LEFT PREVENT clears horizontal on left edge cells (col 1) only
    expect(canTraverseHorizontal(tables, 1, 1)).toBe(false);
    expect(canTraverseHorizontal(tables, 2, 1)).toBe(true);
    expect(canTraverseVertical(tables, 1, 1)).toBe(true);
    expect(canTraverseVertical(tables, 2, 1)).toBe(true);
  });
});
