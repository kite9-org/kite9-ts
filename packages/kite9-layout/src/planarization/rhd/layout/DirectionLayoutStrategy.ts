import type { Layout } from "@kite9/model";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import { AbstractTopDownLayoutStrategy } from "./AbstractTopDownLayoutStrategy.js";
import { DirectionPlacementApproach } from "./DirectionPlacementApproach.js";
import type { PlacementApproach } from "./PlacementApproach.js";

export class DirectionLayoutStrategy extends AbstractTopDownLayoutStrategy {
  public override createPlacementApproach(
    gg: CompoundGroup,
    ld: Layout | null,
    natural: boolean,
  ): PlacementApproach {
    return new DirectionPlacementApproach(this.log, ld, gg, this.rh, natural);
  }
}
