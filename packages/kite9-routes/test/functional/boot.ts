/** Chromium boot for `@kite9/routes` functional tests. */

import { createDiagram } from "@kite9/templating";
import { applyLayout } from "@kite9/preview";
import { testTemplatePack } from "@kite9/test-template";
import { drawTrackGraphPng } from "@kite9/test-template/functional/draw-compaction.ts";
import type { FunctionalLayoutRun } from "@kite9/test-template/functional/functional-layout-run.ts";
import {
  defaultLayoutChecks,
  testDiagram,
  type LayoutChecks,
} from "@kite9/test-template/functional/layout-checks.ts";
import { arrangeGrid, DomElementSizer } from "@kite9/grid";
import { isHorizontalDirection } from "@kite9/model";
import { hubAnchorPoint } from "@kite9/ui";
import { routeConnectionsWithGraph } from "../../src/index.js";
import type { HubTerminal } from "../../src/track-graph.js";

declare global {
  interface Window {
    __kite9Ready?: boolean;
    __runFunctionalLayout?: (
      html: string,
      checks?: Partial<LayoutChecks>,
    ) => FunctionalLayoutRun;
  }
}

const mount = document.getElementById("mount");
if (!mount) throw new Error("No #mount");

function facingMain(hub: HubTerminal) {
  // Stub is perpendicular to the facing seam; the seam is the non-stub track
  // on the junction (or either track when snapped to a seam×seam corner).
  if (isHorizontalDirection(hub.edge)) {
    return hub.intersection.v.kind === "stub"
      ? hub.intersection.h
      : hub.intersection.v;
  }
  return hub.intersection.h.kind === "stub"
    ? hub.intersection.v
    : hub.intersection.h;
}

window.__runFunctionalLayout = (
  html: string,
  checks?: Partial<LayoutChecks>,
): FunctionalLayoutRun => {
  mount.replaceChildren();
  mount.innerHTML = html;
  const root = mount.querySelector("kite9-diagram");
  if (!root) throw new Error("__runFunctionalLayout: no <kite9-diagram>");

  const diagram = createDiagram(root, testTemplatePack);
  const placed = arrangeGrid(diagram, new DomElementSizer());
  const { layout, graph, remap } = routeConnectionsWithGraph(diagram, placed);
  // applyLayout may rewrite paint routes onto a LayoutData sink — clone so
  // artifacts keep GridVertex `route` / startId / endId.
  applyLayout(
    root,
    JSON.parse(JSON.stringify(layout)) as typeof layout,
    testTemplatePack,
  );

  const placementMap: Record<string, (typeof layout.placements)[number]> = {};
  for (const p of layout.placements) placementMap[p.id] = p;

  // Seam + inner (used) + every hub stub.
  const visibleTracks = graph.tracks.filter(
    (t) =>
      t.kind === "seam" ||
      t.kind === "stub" ||
      (t.kind === "inner" && t.usedBy.size > 0),
  );
  const visibleIds = new Set(visibleTracks.map((t) => t.id));

  const hubPts = new Map<string, { x: number; y: number }>();
  for (const hub of graph.hubs) {
    const pt =
      hubAnchorPoint(layout.grid, placementMap, hub.id) ?? {
        x: hub.x,
        y: hub.y,
      };
    hubPts.set(hub.id, pt);
  }

  // Junction / seam intersections with remapped pixels.
  const visibleIntersections = graph.intersections
    .filter((i) => visibleIds.has(i.h.id) && visibleIds.has(i.v.id))
    .map((i) => {
      const owner = graph.hubs.find((h) => h.intersection.id === i.id);
      if (owner) {
        const hp = hubPts.get(owner.id)!;
        const main = facingMain(owner);
        if (isHorizontalDirection(owner.edge)) {
          return {
            id: i.id,
            x: remap.vPx.get(main.after) ?? i.x,
            y: hp.y,
            vAfter: main.after,
            hAfter: i.h.after,
            hId: i.h.id,
            vId: i.v.id,
          };
        }
        return {
          id: i.id,
          x: hp.x,
          y: remap.hPx.get(main.after) ?? i.y,
          vAfter: i.v.after,
          hAfter: main.after,
          hId: i.h.id,
          vId: i.v.id,
        };
      }
      return {
        id: i.id,
        x: remap.vPx.get(i.v.after) ?? i.x,
        y: remap.hPx.get(i.h.after) ?? i.y,
        vAfter: i.v.after,
        hAfter: i.h.after,
        hId: i.h.id,
        vId: i.v.id,
      };
    });

  // Hub dots — same style as intersections (drawn via intersections list).
  for (const hub of graph.hubs) {
    const pt = hubPts.get(hub.id)!;
    visibleIntersections.push({
      id: `hub:${hub.id}`,
      x: pt.x,
      y: pt.y,
      vAfter: 0,
      hAfter: 0,
      hId: hub.stub.id,
      vId: hub.stub.id,
    });
  }

  const seamTracks = visibleTracks
    .filter((t) => t.kind !== "stub")
    .map((t) => {
      const onTrack = visibleIntersections.filter((i) =>
        t.axis === "v" ? i.vId === t.id : i.hId === t.id,
      );
      const along = onTrack.map((i) => (t.axis === "v" ? i.y : i.x));
      const lo = along.length > 0 ? Math.min(...along) : undefined;
      const hi = along.length > 0 ? Math.max(...along) : undefined;
      const span = lo != null && hi != null && hi > lo;
      const used = t.usedBy.size > 0;
      return {
        id: t.id,
        axis: t.axis,
        coord:
          (t.axis === "v" ? remap.vPx.get(t.after) : remap.hPx.get(t.after)) ??
          0,
        after: t.after,
        // Clip to intersection span so strokes meet dots (incl. outward-nudged
        // perimeter seams that sit outside 0…content).
        alongFrom: span ? lo : undefined,
        alongTo: span ? hi : undefined,
        used,
        kind: t.kind,
      };
    });

  const stubTracks = graph.hubs.flatMap((hub) => {
    const pt = hubPts.get(hub.id)!;
    const main = facingMain(hub);
    if (isHorizontalDirection(hub.edge)) {
      const jx = remap.vPx.get(main.after) ?? hub.intersection.x;
      const lo = Math.min(pt.x, jx);
      const hi = Math.max(pt.x, jx);
      if (hi - lo < 0.5) return [];
      return [
        {
          id: hub.stub.id,
          axis: "h" as const,
          coord: pt.y,
          alongFrom: lo,
          alongTo: hi,
          used: hub.stub.usedBy.size > 0,
          kind: "stub",
        },
      ];
    }
    const jy = remap.hPx.get(main.after) ?? hub.intersection.y;
    const lo = Math.min(pt.y, jy);
    const hi = Math.max(pt.y, jy);
    if (hi - lo < 0.5) return [];
    return [
      {
        id: hub.stub.id,
        axis: "v" as const,
        coord: pt.x,
        alongFrom: lo,
        alongTo: hi,
        used: hub.stub.usedBy.size > 0,
        kind: "stub",
      },
    ];
  });

  const compactionPngBase64 = drawTrackGraphPng({
    layout,
    tracks: [...seamTracks, ...stubTracks],
    intersections: visibleIntersections,
  });

  const run: FunctionalLayoutRun = { layout, compactionPngBase64 };

  try {
    testDiagram(diagram, layout, {
      ...defaultLayoutChecks("routes"),
      ...checks,
    });
  } catch (e) {
    run.checkError = e instanceof Error ? e.message : String(e);
  }

  return run;
};

window.__kite9Ready = true;
