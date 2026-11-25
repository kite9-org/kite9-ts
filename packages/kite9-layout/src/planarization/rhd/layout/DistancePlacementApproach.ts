import type { Layout } from "@kite9/model";
import type { Kite9Log } from "../../../logging/Kite9Log.js";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import type { Group } from "../grouping/basic/group/Group.js";
import type { LeafGroup } from "../grouping/basic/group/LeafGroup.js";
import type { RoutableHandler2D } from "../position/RoutableHandler2D.js";
import { AbstractPlacementApproach } from "./AbstractPlacementApproach.js";

/**
 * Score of the placement is based on the length of connections.
 *
 * @author robmoffat
 */
export class DistancePlacementApproach extends AbstractPlacementApproach {
  constructor(
    log: Kite9Log,
    aDirection: Layout | null,
    overall: CompoundGroup,
    readonly rh: RoutableHandler2D,
    natural: boolean,
  ) {
    super(log, aDirection, overall, natural);
  }

  evaluate(): void {
    this.overall.layout = this.aDirection;
    this.score = 0.0;
    this.rh.clearTempPositions(false);
    this.rh.clearTempPositions(true);
    this.log.send("Position of A" + this.overall.a.axis.getPosition(this.rh, true));
    this.log.send("Position of B" + this.overall.b.axis.getPosition(this.rh, true));
    this.evaluateLinks(this.overall.a);
    this.evaluateLinks(this.overall.b);
  }

  private evaluateLinks(group: Group): void {
    group.processLowestLevelLinks({
      process: (originatingGroup, destinationGroup, ld) => {
        const aRI = originatingGroup.axis.getPosition(this.rh, true);
        const bRI = destinationGroup.axis.getPosition(this.rh, true);
        const cost = this.rh.cost(aRI, bRI) * ld.numberOfLinks;
        this.score += cost;
        this.log.send(
          `Evaluating: ${cost}\n\tfrom ${(originatingGroup as LeafGroup).connected} at ${aRI}\n\tto ${(destinationGroup as LeafGroup).connected} at ${bRI}`,
        );
      },
    });
  }
}
