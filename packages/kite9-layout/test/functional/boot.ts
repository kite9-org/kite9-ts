/** Chromium boot for functional layout: measure + arrange in a real browser. */

import type { LayoutData } from "@kite9/model";
import { createDiagram } from "@kite9/templating";
import { applyLayout, testTemplatePack } from "@kite9/test-template";
import { DomElementSizer, layout } from "@kite9/layout";

declare global {
  interface Window {
    __kite9Ready?: boolean;
    __runFunctionalLayout?: (html: string) => LayoutData;
  }
}

const mount = document.getElementById("mount");
if (!mount) throw new Error("No #mount");

window.__runFunctionalLayout = (html: string): LayoutData => {
  mount.replaceChildren();
  mount.innerHTML = html;
  const root = mount.querySelector("kite9-diagram");
  if (!root) throw new Error("__runFunctionalLayout: no <kite9-diagram>");

  const diagram = createDiagram(root, testTemplatePack);
  const result = layout(diagram, new DomElementSizer());
  applyLayout(root, result.layout, testTemplatePack);
  return result.layout;
};

window.__kite9Ready = true;
