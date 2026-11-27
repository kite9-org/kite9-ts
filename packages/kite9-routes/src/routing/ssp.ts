/** Dijkstra successive-shortest-path over track intersections. */

import {
  isHorizontalDirection,
  type Direction,
} from "@kite9/model";
import type { HubTerminal, Intersection, Track } from "../track-graph.js";

export type RouteStep = {
  intersection: Intersection;
  /** Track travelled along to arrive here (null for start). */
  along: Track | null;
};

type Path = {
  steps: RouteStep[];
  cost: number;
  /** Last travel direction for turn costing. */
  lastAlong: Track | null;
};

const TURN_COST = 10;
const STEP_COST = 1;

function neighbours(
  at: Intersection,
  along: Track | null,
): { next: Intersection; via: Track }[] {
  const out: { next: Intersection; via: Track }[] = [];
  for (const n of at.alongH) {
    out.push({ next: n, via: at.h });
  }
  for (const n of at.alongV) {
    out.push({ next: n, via: at.v });
  }
  // Prefer continuing straight when `along` is set: still return all; cost handles turns
  void along;
  return out;
}

/**
 * Shortest path from any start hub intersection to any end hub intersection.
 * Returns null if unreachable.
 */
export function shortestPath(
  starts: HubTerminal[],
  ends: HubTerminal[],
): { steps: RouteStep[]; start: HubTerminal; end: HubTerminal } | null {
  if (starts.length === 0 || ends.length === 0) return null;

  const endSet = new Map(ends.map((e) => [e.intersection.id, e]));

  type Node = {
    ix: Intersection;
    cost: number;
    prev: Node | null;
    via: Track | null;
    start: HubTerminal;
  };

  const best = new Map<string, number>();
  const queue: Node[] = [];

  for (const s of starts) {
    const n: Node = {
      ix: s.intersection,
      cost: 0,
      prev: null,
      via: null,
      start: s,
    };
    queue.push(n);
    best.set(`${s.id}|${s.intersection.id}`, 0);
  }

  let found: Node | null = null;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const cur = queue.shift()!;
    const endHub = endSet.get(cur.ix.id);
    if (endHub && cur.start.onId !== endHub.onId) {
      found = cur;
      // attach end via found — break with this node
      (found as Node & { end?: HubTerminal }).end = endHub;
      break;
    }

    for (const { next, via } of neighbours(cur.ix, cur.via)) {
      const turn = cur.via != null && cur.via !== via ? TURN_COST : 0;
      const nextCost = cur.cost + STEP_COST + turn;
      const key = `${cur.start.id}|${next.id}`;
      const prevBest = best.get(key);
      if (prevBest != null && prevBest <= nextCost) continue;
      best.set(key, nextCost);
      queue.push({
        ix: next,
        cost: nextCost,
        prev: cur,
        via,
        start: cur.start,
      });
    }
  }

  if (!found) return null;
  const endHub =
    (found as Node & { end?: HubTerminal }).end ?? endSet.get(found.ix.id)!;
  const steps: RouteStep[] = [];
  let n: Node | null = found;
  while (n) {
    steps.push({ intersection: n.ix, along: n.via });
    n = n.prev;
  }
  steps.reverse();
  return { steps, start: found.start, end: endHub };
}

/**
 * Facing track at a hub: left/right sit on the vertical seam; up/down on the
 * horizontal. Do not mark the unused cross-axis (e.g. top h-seam for a
 * left↔right hop).
 */
function facingTrack(hub: HubTerminal, ix: Intersection): Track {
  return isHorizontalDirection(hub.edge) ? ix.v : ix.h;
}

/** Mark tracks used by a routed path (travelled + facing terminal seams only). */
export function markTracksUsed(
  steps: RouteStep[],
  connectionId: string,
  start: HubTerminal,
  end: HubTerminal,
): void {
  for (const s of steps) {
    if (s.along) s.along.usedBy.add(connectionId);
  }
  if (steps.length === 0) return;
  facingTrack(start, steps[0]!.intersection).usedBy.add(connectionId);
  facingTrack(end, steps[steps.length - 1]!.intersection).usedBy.add(
    connectionId,
  );
}

export type { Direction, Path };
