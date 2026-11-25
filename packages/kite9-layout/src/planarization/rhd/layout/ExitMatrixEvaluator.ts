import { reverseLayout, type Layout } from "@kite9/model";
import type { Bounds } from "../../../common/objects/Bounds.js";
import type { LinkDetail } from "../links/LinkManager.js";
import { DPos, type RoutableHandler2D } from "../position/RoutableHandler2D.js";
import { RelativeSide, type ExitMatrix } from "./ExitMatrix.js";

const f = Math.fround;
const OCCLUDED_COST = f(0.5);
const STRAIGHT_VS_CORNER_COST = f(0.5);

/**
 * Tries to work out the likelihood of an overlap.
 *
 * @author robmoffat
 */
export class ExitMatrixEvaluator {
  /** A heuristic calculation for the likely number of crossings due to this arragement */
  countOverlaps(
    aMatrix: ExitMatrix,
    bMatrix: ExitMatrix,
    aDirection: Layout,
    rh: RoutableHandler2D,
  ): number {
    const sideA = this.sumOneSide(aMatrix, bMatrix, aDirection, -1);
    const sideB = this.sumOneSide(aMatrix, bMatrix, aDirection, +1);
    const occlusionA = this.addOneOccludedSide(aMatrix, bMatrix, aDirection, rh);
    const occlusionB = this.addOneOccludedSide(bMatrix, aMatrix, reverseLayout(aDirection), rh);
    return f(f(f(sideA + sideB) + occlusionA) + occlusionB);
  }

  /** Works out the extra distance of external links due to this arrangement */
  calculateExtraExternalLinkDistance(
    aMatrix: ExitMatrix,
    bMatrix: ExitMatrix,
    aDirection: Layout | null,
    _rh: RoutableHandler2D | null,
  ): number {
    return (
      this.calcEEDistanceOneSide(aMatrix, bMatrix.getSizeInDirectionOfLayout(aDirection), aDirection) +
      this.calcEEDistanceOneSide(
        bMatrix,
        aMatrix.getSizeInDirectionOfLayout(aDirection),
        reverseLayout(aDirection),
      )
    );
  }

  private calcEEDistanceOneSide(aMatrix: ExitMatrix, distance: Bounds, d: Layout | null): number {
    const count = f(
      f(
        aMatrix.getLinkCount(d, RelativeSide.OPPOSITE, -1) +
          aMatrix.getLinkCount(d, RelativeSide.OPPOSITE, 0),
      ) + aMatrix.getLinkCount(d, RelativeSide.OPPOSITE, 1),
    );
    const incrementalDistance = distance.distanceMax - distance.distanceMin;
    return count * incrementalDistance;
  }

  /** Works out the cost score for the distance travelled by the internal links */
  calculateInternalDistance(internal: LinkDetail | null, rh: RoutableHandler2D): number {
    if (internal == null) return 0.0;
    let out = 0.0;
    internal.processLowestLevel({
      process: (originatingGroup, destinationGroup, ld) => {
        const aRI = originatingGroup.axis.getPosition(rh, true);
        const bRI = destinationGroup.axis.getPosition(rh, true);
        const cost = rh.cost(aRI, bRI) * ld.numberOfLinks;
        out += cost;
      },
    });
    return out;
  }

  /**
   * Figures out a cost associated with one side of the matrix based on the likelihood of leaving
   * edges crossing one another.
   */
  private sumOneSide(aMatrix: ExitMatrix, bMatrix: ExitMatrix, ad: Layout, rank: number): number {
    const bFacing = bMatrix.getLinkCount(ad, RelativeSide.FACING, rank);
    const aMid = aMatrix.getLinkCount(ad, RelativeSide.MIDDLE, rank);
    const bMid = bMatrix.getLinkCount(ad, RelativeSide.MIDDLE, rank);
    const aOpp = aMatrix.getLinkCount(ad, RelativeSide.OPPOSITE, rank);
    const cornerCross = f(bFacing * aOpp);
    const midCrossB = f(f(aOpp * bMid) * STRAIGHT_VS_CORNER_COST);
    const midCrossA = f(f(bFacing * aMid) * STRAIGHT_VS_CORNER_COST);
    return f(f(cornerCross + midCrossB) + midCrossA);
  }

  /**
   * Work out how many edges you will have to cross to get from the occluded square to where you
   * want to go.
   *
   * When a matrix with a small span is occluded by one with a large span, we need to add
   * crossings in order to "break in" to the space of the larger one.
   */
  private addOneOccludedSide(
    aMatrix: ExitMatrix,
    bMatrix: ExitMatrix,
    ad: Layout | null,
    rh: RoutableHandler2D,
  ): number {
    const aOccluded = aMatrix.getLinkCount(ad, RelativeSide.OPPOSITE, 0);
    if (aOccluded === 0) {
      return 0;
    }
    const facingOccluding = f(bMatrix.getLinkCount(ad, RelativeSide.FACING, 0) / 2);
    let lowerOccluding = f(this.getLinkCountOnSide(bMatrix, ad, -1) + facingOccluding);
    let higherOccluding = f(this.getLinkCountOnSide(bMatrix, ad, 1) + facingOccluding);
    lowerOccluding = f(lowerOccluding * aOccluded);
    higherOccluding = f(higherOccluding * aOccluded);

    // large span check
    const aSpan = aMatrix.getSpanInDirectionOfLayout(reverseLayout(ad)!);
    const bSpan = bMatrix.getSpanInDirectionOfLayout(reverseLayout(ad)!);
    if (rh.compareBounds(aSpan!, bSpan!) === DPos.OVERLAP) {
      const bOccluding = bMatrix.getLinkCount(ad, RelativeSide.OPPOSITE, 0);

      // works out the occluded span
      const occludedMin = Math.max(aSpan!.distanceMin, bSpan!.distanceMin);
      const occludedMax = Math.min(aSpan!.distanceMax, bSpan!.distanceMax);
      const topOccludedFrac = (occludedMax - occludedMin) / (aSpan!.distanceMax - aSpan!.distanceMin);

      // work out how much of b you would have to cross to get back to where you started from
      const lowerTravel = occludedMax - bSpan!.distanceMin;
      const higherTravel = bSpan!.distanceMax - occludedMin;

      // work out travel as a fraction of b
      const lowerFrac = lowerTravel / (bSpan!.distanceMax - bSpan!.distanceMin);
      const higherFrac = higherTravel / (bSpan!.distanceMax - bSpan!.distanceMin);

      // work out how many edge crossings that's likely to be
      const lowerAmt = topOccludedFrac * lowerFrac * bOccluding * aOccluded;
      const higherAmt = topOccludedFrac * higherFrac * bOccluding * aOccluded;
      lowerOccluding = f(lowerOccluding + f(lowerAmt));
      higherOccluding = f(higherOccluding + f(higherAmt));
    }
    return f(Math.min(lowerOccluding, higherOccluding) * OCCLUDED_COST);
  }

  private getLinkCountOnSide(mat: ExitMatrix, ad: Layout | null, side: number): number {
    return f(
      f(
        mat.getLinkCount(ad, RelativeSide.FACING, side) +
          mat.getLinkCount(ad, RelativeSide.MIDDLE, side),
      ) + mat.getLinkCount(ad, RelativeSide.OPPOSITE, side),
    );
  }
}
