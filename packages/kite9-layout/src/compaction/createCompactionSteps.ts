import type { GridPositioner } from "../common/elements/grid/GridPositioner.js";
import type { PositionRoutableHandler2D } from "../planarization/rhd/position/PositionRoutableHandler2D.js";
import type { ElementSizer } from "../sizer.js";
import type { CompactionStep } from "./CompactionStep.js";
import { HierarchicalCompactionStep } from "./hierarchy/HierarchicalCompactionStep.js";
import { NeighbourCheckingStep } from "./hierarchy/NeighbourCheckingStep.js";
import { RectangularPositionCompactionStep } from "./hierarchy/RectangularPositionCompactionStep.js";
import { ContainerLabelCompactionStep } from "./labels/ContainerLabelCompactionStep.js";
import { LoggingCompactionStep } from "./logging/LoggingCompactionStep.js";
import { ConnectionPositionCompactionStep } from "./routing/ConnectionPositionCompactionStep.js";
import { ConnectionRouterCompactionStep } from "./routing/ConnectionRouterCompactionStep.js";
import { DiagramSizeCompactionStep } from "./sizing/DiagramSizeCompactionStep.js";
import { FanMinimizeCompactionStep } from "./sizing/FanMinimizeCompactionStep.js";

/**
 * The compaction steps used by `NGArrangementPipeline`, in order.
 */
export function createDefaultCompactionSteps(
  cd: ElementSizer,
  rr: PositionRoutableHandler2D,
  gp: GridPositioner,
): CompactionStep[] {
  return [
    new HierarchicalCompactionStep(cd, rr, gp),
    new NeighbourCheckingStep(cd),
    new LoggingCompactionStep(cd),
    new ConnectionRouterCompactionStep(cd, gp),
    new ContainerLabelCompactionStep(cd, gp),
    new LoggingCompactionStep(cd),
    new DiagramSizeCompactionStep(cd),
    new LoggingCompactionStep(cd),
    new FanMinimizeCompactionStep(cd),
    new LoggingCompactionStep(cd),
    new RectangularPositionCompactionStep(cd),
    new ConnectionPositionCompactionStep(cd),
    new LoggingCompactionStep(cd),
  ];
}
