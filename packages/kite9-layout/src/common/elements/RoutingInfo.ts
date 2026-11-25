import type { Comparable } from "@kite9/model";

/**
 * Stores some kind of information about the planarization position of a vertex in order that we
 * can route edges around it.
 */
export interface RoutingInfo extends Comparable<RoutingInfo> {
  outputX(): string;
  outputY(): string;
  centerX(): number;
  centerY(): number;
  compareX(withInfo: RoutingInfo): number;
  compareY(withInfo: RoutingInfo): number;
}
