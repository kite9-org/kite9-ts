import type { LayoutData } from "@kite9/model";
import {
  bootCardEditScene,
  markCardEditReady,
} from "@kite9/test-template";
import cardLayout from "@kite9/test-template/fixtures/grid/card.json";
import type { Behaviour } from "@kite9/ui";
import {
  createActionableBehaviour,
  createResizableBehaviour,
  createSelectableBehaviour,
  createStyleableBehaviour,
} from "../src/index.js";
import {
  E2E_BEHAVIOUR_IDS,
  isE2eBehaviourId,
  type E2eBehaviourId,
} from "./behaviour-ids.js";

const factories: Record<E2eBehaviourId, () => Behaviour> = {
  selectable: createSelectableBehaviour,
  actionable: createActionableBehaviour,
  styleable: createStyleableBehaviour,
  resizable: createResizableBehaviour,
};

function resolveBehaviours(ids: readonly string[]): Behaviour[] {
  return ids.map((id) => {
    if (!isE2eBehaviourId(id)) {
      throw new Error(
        `Unknown e2e behaviour "${id}". Expected one of: ${E2E_BEHAVIOUR_IDS.join(", ")}`,
      );
    }
    return factories[id]();
  });
}

const mount = document.getElementById("mount");
if (!mount) throw new Error("No #mount");

const raw = new URLSearchParams(location.search).get("behaviours") ?? "";
const ids = raw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (ids.length === 0) {
  throw new Error(
    "e2e boot requires ?behaviours=… (e.g. selectable or selectable,actionable,styleable)",
  );
}

bootCardEditScene(
  mount,
  resolveBehaviours(ids),
  cardLayout as LayoutData,
);
markCardEditReady();
