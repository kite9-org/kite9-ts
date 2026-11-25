import { Dimension } from "@kite9/model";
import type { Connection, Dimension2D, RouteRenderingInformation, Terminator } from "@kite9/model";
import { BasicDimension2DImpl } from "../../common/objects/Dimension2DImpl.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

type S = CompactionSlideable;
/** (horizontal-axis slideable, vertical-axis slideable) */
type SlideablePair = readonly [S, S];

/**
 * Decorates the compaction process to handle Connections which have RouteRenderingInformation.
 *
 * Needs to be done after the positions of all edges have been set.
 *
 * @author robmoffat
 */
export class ConnectionPositionCompactionStep extends AbstractCompactionStep {
  get prefix(): string {
    return "CPOS";
  }

  compact(c: Compaction, _g: Group): void {
    for (const [k, v] of this.buildRoutes(c)) {
      this.setRoute(k, v);
    }
  }

  private create1DRouteMap(cso: SlackOptimisation): Map<Connection, Map<number, S>> {
    cso.checkConsistency();
    const out = new Map<Connection, Map<number, S>>();

    for (const rs of cso.getAllSlideables()) {
      for (const a of rs.getConnAnchors()) {
        if (!a.e.getRenderingInformation().rendered) continue;
        let map = out.get(a.e);
        if (map == null) {
          map = new Map();
          out.set(a.e, map);
        }
        map.set(a.s, rs);
      }
    }

    return out;
  }

  private zipMapsToList<A>(h: ReadonlyMap<number, A>, v: ReadonlyMap<number, A>): [A, A][] {
    const indices = [...new Set([...h.keys(), ...v.keys()])].sort((a, b) => a - b);
    return indices.map((it): [A, A] => [h.get(it)!, v.get(it)!]).reverse();
  }

  private buildRoutes(c: Compaction): Map<Connection, SlideablePair[]> {
    const hsMap = this.create1DRouteMap(c.getSlackOptimisation(Dimension.H));
    const vsMap = this.create1DRouteMap(c.getSlackOptimisation(Dimension.V));

    const out = new Map<Connection, SlideablePair[]>();
    for (const [k, h] of hsMap) {
      out.set(k, this.zipMapsToList(h, vsMap.get(k)!));
    }
    return out;
  }

  private setRoute(tle: Connection, points: readonly SlideablePair[]): void {
    const out = tle.getRenderingInformation();
    out.clear();
    let first = true;
    let last: Dimension2D | null = null;
    for (const v of points) {
      const next = this.addToRoute(out, v, last);
      if (first && last != null && next != null) {
        this.setTerminatorPositionAndOrientation(tle.getFromDecoration(), last);
        first = false;
      }
      if (next != null) {
        last = next;
      }
    }
    if (last != null) {
      this.setTerminatorPositionAndOrientation(tle.getToDecoration(), last);
    }
  }

  private addToRoute(
    out: RouteRenderingInformation,
    p: SlideablePair,
    prev: Dimension2D | null,
  ): Dimension2D | null {
    const horizSeg = p[0];
    const vertSeg = p[1];
    const p1: Dimension2D = new BasicDimension2DImpl(
      horizSeg.minimumPosition,
      vertSeg.minimumPosition,
    );
    if (prev != null && prev.x() === p1.x() && prev.y() === p1.y()) {
      return null; // prevent duplicates in the list
    }
    out.add(p1);
    return p1;
  }

  private setTerminatorPositionAndOrientation(t: Terminator | null, pos: Dimension2D): void {
    if (t == null) {
      return;
    }

    const rri = t.getRenderingInformation();
    rri.position = new BasicDimension2DImpl(pos.x(), pos.y());
    rri.size = new BasicDimension2DImpl(0.0, 0.0);
  }
}
