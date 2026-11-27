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

  // Only paint tracks that became routing lanes — unused seams sit on cell
  // borders and read as "butting" the glyphs.
  const usedTracks = graph.tracks.filter((t) => t.usedBy.size > 0);
  const usedIds = new Set(usedTracks.map((t) => t.id));
  const compactionPngBase64 = drawTrackGraphPng({
    layout,
    tracks: usedTracks.map((t) => ({
      id: t.id,
      axis: t.axis,
      coord:
        (t.axis === "v" ? remap.vPx.get(t.after) : remap.hPx.get(t.after)) ??
        0,
      after: t.after,
      used: true,
      kind: t.kind,
    })),
    intersections: graph.intersections
      .filter((i) => usedIds.has(i.h.id) || usedIds.has(i.v.id))
      .map((i) => ({
        id: i.id,
        x: remap.vPx.get(i.v.after) ?? 0,
        y: remap.hPx.get(i.h.after) ?? 0,
        vAfter: i.v.after,
        hAfter: i.h.after,
      })),
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
