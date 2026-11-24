import { LocalCommandContext } from "@kite9/command";
import type { LayoutData } from "@kite9/model";
import { createDiagram } from "@kite9/templating";
import {
  AdjustableLayout,
  applyBehaviourPack,
  type Behaviour,
} from "@kite9/ui";
import { applyLayout } from "../apply-layout.js";
import { testTemplatePack } from "../pack.js";
import { mountCardDiagram, type CardDiagramOptions } from "./card-diagram.js";

export type BootCardEditOptions = CardDiagramOptions & {
  /** BehaviourPack id (default `"editable"`). */
  packId?: string;
};

/**
 * Mount the shared card diagram, paint + layout, apply behaviours.
 * Used by behaviour Playwright e2e boots — no per-behaviour HTML fixtures.
 */
export function bootCardEditScene(
  parent: ParentNode,
  behaviours: readonly Behaviour[],
  layoutSource: LayoutData,
  options: BootCardEditOptions = {},
): Element {
  const { packId = "editable", mode = "edit", id } = options;
  const root = mountCardDiagram(parent, { id, mode });
  createDiagram(root, testTemplatePack);

  const layout = AdjustableLayout.from(layoutSource);
  const paint = () => applyLayout(root, layout, testTemplatePack);
  paint();

  const command = new LocalCommandContext(root);
  applyBehaviourPack(
    { id: packId, behaviours },
    root,
    command,
    { layout, apply: paint },
  );

  return root;
}

/** Signal Playwright that the scene is ready. */
export function markCardEditReady(): void {
  (window as unknown as { __kite9Ready: boolean }).__kite9Ready = true;
}
