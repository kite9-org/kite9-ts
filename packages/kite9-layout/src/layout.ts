/** Layout pipeline: RHD grouping → placement → compaction → LayoutData. */

import type { Diagram, LayoutData } from "@kite9/model";
import { GridPositionerImpl } from "./common/elements/grid/GridPositionerImpl.js";
import type { Compaction } from "./compaction/Compaction.js";
import {
  CompactionImpl,
  PluggableCompactor,
  createDefaultCompactionSteps,
} from "./compaction/index.js";
import { LayoutDiagramElementFactory } from "./factory/LayoutDiagramElementFactory.js";
import { Kite9LogFactory } from "./logging/Kite9Log.js";
import { LogicException } from "./logging/LogicException.js";
import { NullKite9Log } from "./logging/NullKite9Log.js";
import {
  BasicContradictionHandler,
  DirectionLayoutStrategy,
  GeneratorBasedGroupingStrategyImpl,
  MostNetworkedFirstLayoutQueue,
  PositionRoutableHandler2D,
  Util,
  type GroupResult,
} from "./planarization/index.js";
import { DomElementSizer, type ElementSizer } from "./sizer.js";
import { toLayoutData } from "./to-layout-data.js";

export type LayoutResult = {
  layout: LayoutData;
  grouping: GroupResult;
  routable: PositionRoutableHandler2D;
  compaction: Compaction;
};

let logFactoryReady = false;

function ensureLogFactory(): void {
  if (logFactoryReady && Kite9LogFactory.factory) return;
  Kite9LogFactory.factory = () => new NullKite9Log();
  logFactoryReady = true;
}

/**
 * Run the full layout pipeline on an already-built model diagram.
 * Leaf sizes / gaps come from {@link ElementSizer} (default: DOM measure).
 */
export function layout(
  diagram: Diagram,
  sizer: ElementSizer = new DomElementSizer(),
): LayoutResult {
  ensureLogFactory();

  const ef = new LayoutDiagramElementFactory();
  const gp = new GridPositionerImpl(ef);
  const elements = Util.countConnectedElements(diagram);
  const ch = new BasicContradictionHandler();
  const strategy = new GeneratorBasedGroupingStrategyImpl(
    diagram,
    elements,
    ch,
    gp,
    ef,
  );
  strategy.buildInitialGroups();
  const grouping = strategy.group();

  const groups = [...grouping.groups()];
  if (groups.length !== 1) {
    throw new LogicException(
      `Expected a single top group, got ${groups.length}`,
    );
  }

  const routable = new PositionRoutableHandler2D();
  const placement = new DirectionLayoutStrategy(routable);
  placement.layout(
    grouping,
    new MostNetworkedFirstLayoutQueue(groups[0]!.groupNumber),
  );

  const compaction = new CompactionImpl(diagram);
  const steps = createDefaultCompactionSteps(sizer, routable, gp);
  new PluggableCompactor(steps).compactDiagram(diagram, grouping, compaction);

  return {
    layout: toLayoutData(diagram),
    grouping,
    routable,
    compaction,
  };
}
