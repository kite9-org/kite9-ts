import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";

export abstract class PositionRoutingInfo implements RoutingInfo {
  abstract getMinX(): number;
  abstract getMaxX(): number;
  abstract getMinY(): number;
  abstract getMaxY(): number;
  abstract getWidth(): number;
  abstract getHeight(): number;
  abstract centerX(): number;
  abstract centerY(): number;
  abstract compareTo(other: RoutingInfo): number;
  abstract compareX(withInfo: RoutingInfo): number;
  abstract compareY(withInfo: RoutingInfo): number;

  outputX(): string {
    return `${this.getMinX()}-${this.getMaxX()}`;
  }

  outputY(): string {
    return `${this.getMinY()}-${this.getMaxY()}`;
  }

  toString(): string {
    return this.outputX() + ", " + this.outputY();
  }
}
