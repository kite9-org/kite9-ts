/** Chromium boot for `@kite9/grid` functional tests. */

import { createDiagram } from "@kite9/templating";
import { applyLayout } from "@kite9/preview";
import { testTemplatePack } from "@kite9/test-template";
import type { FunctionalLayoutRun } from "@kite9/test-template/functional/functional-layout-run.ts";
import {
  defaultLayoutChecks,
  testDiagram,
  type LayoutChecks,
} from "@kite9/test-template/functional/layout-checks.ts";
import { arrangeGrid, DomElementSizer } from "../../src/index.js";

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
  const layout = arrangeGrid(diagram, new DomElementSizer());
  applyLayout(root, layout, testTemplatePack);

  const run: FunctionalLayoutRun = { layout };

  try {
    testDiagram(diagram, layout, {
      ...defaultLayoutChecks("grid"),
      ...checks,
    });
  } catch (e) {
    run.checkError = e instanceof Error ? e.message : String(e);
  }

  return run;
};

window.__kite9Ready = true;
