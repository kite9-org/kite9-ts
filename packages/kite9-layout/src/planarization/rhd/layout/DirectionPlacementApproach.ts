import { reverseLayout, type Layout } from "@kite9/model";
import type { Kite9Log } from "../../../logging/Kite9Log.js";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import type { Group } from "../grouping/basic/group/Group.js";
import { DirectedLinkManager } from "../grouping/directed/group/DirectedLinkManager.js";
import type { LinkDetail } from "../links/LinkManager.js";
import type { RoutableHandler2D } from "../position/RoutableHandler2D.js";
import { AbstractPlacementApproach } from "./AbstractPlacementApproach.js";
import { ExitMatrix } from "./ExitMatrix.js";
import { ExitMatrixEvaluator } from "./ExitMatrixEvaluator.js";

/** mulitplier allowing you to add distance to crossings. */
const DISTANCE_COST = Math.fround(0.2);

/**
 * A placement approach arranges the two groups within a compound group, based on compass directions.
 *
 * The placement approach positions the attr and then works out how much the placement 'costs' in terms of the
 * overlaps of the resulting edges, rather than the distances.
 *
 * @author robmoffat
 */
export class DirectionPlacementApproach extends AbstractPlacementApproach {
  readonly ev = new ExitMatrixEvaluator();

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
    this.rh.clearTempPositions(false);
    this.rh.clearTempPositions(true);
    this.log.send("Position of A" + this.overall.a.axis.getPosition(this.rh, true));
    const aMatrix = this.createMatrix(this.overall.a, this.overall.internalLinkA);
    this.log.send(`A Matrix: ${aMatrix}`);
    this.log.send("Position of B" + this.overall.b.axis.getPosition(this.rh, true));
    const bMatrix = this.createMatrix(this.overall.b, this.overall.internalLinkB);
    this.log.send(`B Matrix: ${bMatrix}`);

    // can't understand how this got reversed
    const matrixDirection = reverseLayout(this.aDirection);
    this.score = this.ev.countOverlaps(aMatrix, bMatrix, matrixDirection!, this.rh);
    const externalDistance = this.ev.calculateExtraExternalLinkDistance(
      aMatrix,
      bMatrix,
      matrixDirection,
      this.rh,
    );
    const internalDistance = this.ev.calculateInternalDistance(this.overall.internalLinkA, this.rh);
    this.log.send(`Overlap score: ${this.score}`);
    this.log.send(`Internal distance cost: ${internalDistance}`);
    this.log.send(`External distance cost: ${externalDistance}`);
    this.score += (internalDistance + externalDistance) * DISTANCE_COST;
  }

  private createMatrix(withGroup: Group, ignore: LinkDetail | null): ExitMatrix {
    const position = withGroup.axis.getPosition(this.rh, true);
    const out = new ExitMatrix();
    out.setSize(this.rh.getBoundsOf(position, true), this.rh.getBoundsOf(position, false));
    withGroup.processAllLeavingLinks(true, DirectedLinkManager.all(), {
      process: (_originatingGroup, _destinationGroup, ld) => {
        if (ld !== ignore) {
          ld.processLowestLevel({
            process: (originatingGroup, destinationGroup, ld2) => {
              out.addLink(originatingGroup, destinationGroup, ld2, this.rh);
            },
          });
        }
      },
    });
    return out;
  }
}
