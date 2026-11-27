/** Chromium boot for `@kite9/routes` functional tests. */

import { createDiagram } from "@kite9/templating";
import { applyLayout, testTemplatePack } from "@kite9/test-template";
import { drawTrackGraphPng } from "@kite9/test-template/functional/draw-compaction.ts";
import type { FunctionalLayoutRun } from "@kite9/test-template/functional/functional-layout-run.ts";
import {
  defaultLayoutChecks,
  testDiagram,
  type LayoutChecks,
} from "@kite9/test-template/functional/layout-checks.ts";
import { arrangeGrid, DomElementSizer } from "@kite9/grid";
import { routeConnectionsWithGraph } from "../../src/index.js";

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

  // All row/column seams (so padding + routing boundaries show), plus any
  // used inner-circuit tracks. Pre-inflate R rows → R+1 horizontal seams.
  const visibleTracks = graph.tracks.filter(
    (t) => t.kind === "seam" || t.usedBy.size > 0,
  );
  const visibleIds = new Set(visibleTracks.map((t) => t.id));
  const visibleIntersections = graph.intersections
    .filter((i) => visibleIds.has(i.h.id) && visibleIds.has(i.v.id))
    .map((i) => ({
      id: i.id,
      x: remap.vPx.get(i.v.after) ?? 0,
      y: remap.hPx.get(i.h.after) ?? 0,
      vAfter: i.v.after,
      hAfter: i.h.after,
      hId: i.h.id,
      vId: i.v.id,
    }));
  const compactionPngBase64 = drawTrackGraphPng({
    layout,
    tracks: visibleTracks.map((t) => {
      const onTrack = visibleIntersections.filter((i) =>
        t.axis === "v" ? i.vId === t.id : i.hId === t.id,
      );
      const along = onTrack.map((i) => (t.axis === "v" ? i.y : i.x));
      const lo = along.length > 0 ? Math.min(...along) : undefined;
      const hi = along.length > 0 ? Math.max(...along) : undefined;
      // A single intersection collapses to zero length — keep full span then.
      const span = lo != null && hi != null && hi > lo;
      return {
        id: t.id,
        axis: t.axis,
        coord:
          (t.axis === "v" ? remap.vPx.get(t.after) : remap.hPx.get(t.after)) ??
          0,
        after: t.after,
        alongFrom: span ? lo : undefined,
        alongTo: span ? hi : undefined,
        used: t.usedBy.size > 0,
        kind: t.kind,
      };
    }),
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
