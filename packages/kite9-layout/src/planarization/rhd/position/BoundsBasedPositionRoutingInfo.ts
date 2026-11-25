import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";
import type { Bounds } from "../../../common/objects/Bounds.js";
import { PositionRoutingInfo } from "./PositionRoutingInfo.js";

export class BoundsBasedPositionRoutingInfo extends PositionRoutingInfo {
  constructor(
    readonly x: Bounds,
    readonly y: Bounds,
  ) {
    super();
  }

  centerX(): number {
    return this.x.distanceCenter;
  }

  centerY(): number {
    return this.y.distanceCenter;
  }

  getMinX(): number {
    return this.x.distanceMin;
  }

  getMaxX(): number {
    return this.x.distanceMax;
  }

  getMinY(): number {
    return this.y.distanceMin;
  }

  getMaxY(): number {
    return this.y.distanceMax;
  }

  getWidth(): number {
    return this.getMaxX() - this.getMinX();
  }

  getHeight(): number {
    return this.getMaxY() - this.getMinY();
  }

  compareTo(other: RoutingInfo): number {
    const bbri = other as BoundsBasedPositionRoutingInfo;
    const yc = this.y.compareTo(bbri.y);
    return yc !== 0 ? yc : this.x.compareTo(bbri.x);
  }

  compareX(withInfo: RoutingInfo): number {
    return this.x.compareTo((withInfo as BoundsBasedPositionRoutingInfo).x);
  }

  compareY(withInfo: RoutingInfo): number {
    return this.y.compareTo((withInfo as BoundsBasedPositionRoutingInfo).y);
  }
}
