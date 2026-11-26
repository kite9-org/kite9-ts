/** Chromium boot for functional layout: measure + arrange in a real browser. */

import { createDiagram } from "@kite9/templating";
import { applyLayout, testTemplatePack } from "@kite9/test-template";
import { DomElementSizer, layout } from "@kite9/layout";
import {
  drawCompactionPng,
  drawPositionsPng,
} from "./helpers/debug-draw.js";
import type { FunctionalLayoutRun } from "./helpers/functional-layout-run.js";
import {
  defaultLayoutChecks,
  testDiagram,
  type LayoutChecks,
} from "./helpers/layout-checks.js";

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
  const result = layout(diagram, new DomElementSizer());
  applyLayout(root, result.layout, testTemplatePack);

  testDiagram(diagram, result.layout, {
    ...defaultLayoutChecks(),
    ...checks,
  });

  return {
    layout: result.layout,
    positionsPngBase64: drawPositionsPng(result.grouping, result.routable),
    compactionPngBase64: drawCompactionPng(result.compaction),
  };
};

window.__kite9Ready = true;
