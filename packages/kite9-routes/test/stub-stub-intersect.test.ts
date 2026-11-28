import { BorderTraversal, Direction } from "@kite9/css";
import type { Diagram, LayoutData, Rectangular } from "@kite9/model";
import { DiagramElementType, Layout } from "@kite9/model";
import { describe, expect, it } from "vitest";
import { buildTrackGraph } from "../src/track-graph.js";


function mockRect(
  id: string,
  traversal: BorderTraversal,
  contents: Rectangular[] = [],
): Rectangular {
  return {
    getID: () => id,
    getType: () => DiagramElementType.CONNECTED_RECTANGULAR,
    getParent: () => null,
    getDepth: () => 1,
    getContainer: () => null,
    getContents: () => contents,
    addTemporaryContent: () => {},
    getTraversalRule: () => traversal,
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

describe("intersectOrthogonalPropagatedStubs", () => {
  it("adds stub×stub when H and V stubs share a propagated cell", () => {
    // 3×3 empty grid (all ALWAYS / empty) with two leaves at corners so their
    // outward stubs cross in the centre cell (2,2).
    // a at (1,2) RIGHT → enters (2,2), (3,2)
    // b at (2,1) DOWN → enters (2,2), (2,3)
    const layout: LayoutData = {
      grid: {
        contentCols: 3,
        contentRows: 3,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [40, 40, 40],
        contentRowSizes: [40, 40, 40],
        colSizes: [40, 40, 40],
        rowSizes: [40, 40, 40],
      },
      placements: [
        { id: "a", col: 1, row: 2 },
        { id: "b", col: 2, row: 1 },
      ],
    };

    const diagram = mockDiagram([
      mockRect("a", BorderTraversal.PREVENT),
      mockRect("b", BorderTraversal.PREVENT),
    ]);

    const graph = buildTrackGraph(diagram, layout);
    // buildTrackGraph already propagates + intersects; assert stub×stub exists
    const stubStub = graph.intersections.filter(
      (i) => i.h.kind === "stub" && i.v.kind === "stub",
    );
    expect(stubStub.length).toBeGreaterThan(0);

    const aRight = graph.hubs.find(
      (h) => h.onId === "a" && h.edge === Direction.RIGHT,
    )!;
    const bDown = graph.hubs.find(
      (h) => h.onId === "b" && h.edge === Direction.DOWN,
    )!;
    const cross = stubStub.find(
      (i) => i.h === aRight.stub && i.v === bDown.stub,
    );
    expect(cross).toBeTruthy();
    expect(cross!.x).toBe(bDown.x);
    expect(cross!.y).toBe(aRight.y);
  });

  it("does not cross when stubs miss each other’s cells", () => {
    // a RIGHT along row 1; b DOWN along col 3 — no shared cell
    const layout: LayoutData = {
      grid: {
        contentCols: 3,
        contentRows: 3,
        gutter: 0,
        minCol: 40,
        minRow: 40,
        contentColSizes: [40, 40, 40],
        contentRowSizes: [40, 40, 40],
        colSizes: [40, 40, 40],
        rowSizes: [40, 40, 40],
      },
      placements: [
        { id: "a", col: 1, row: 1 },
        { id: "b", col: 3, row: 1 },
      ],
    };
    const diagram = mockDiagram([
      mockRect("a", BorderTraversal.PREVENT),
      mockRect("b", BorderTraversal.PREVENT),
    ]);

    // Manual propagate without full attach so we control cells
    const graph = buildTrackGraph(diagram, layout);
    const aRight = graph.hubs.find(
      (h) => h.onId === "a" && h.edge === Direction.RIGHT,
    )!;
    const bDown = graph.hubs.find(
      (h) => h.onId === "b" && h.edge === Direction.DOWN,
    )!;
    const cross = graph.intersections.find(
      (i) => i.h === aRight.stub && i.v === bDown.stub,
    );
    // a at row1 RIGHT enters (2,1),(3,1); b at (3,1) DOWN enters rows below at col3
    // they may share if b DOWN enters cells a RIGHT also entered — (3,2),(3,3) vs (2,1),(3,1)
    // no share → no aRight×bDown
    expect(cross).toBeUndefined();
  });
});
