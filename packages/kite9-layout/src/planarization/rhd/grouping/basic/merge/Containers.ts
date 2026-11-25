import type { Rectangular } from "@kite9/model";
import { LogicException } from "../../../../../logging/LogicException.js";
import type { Group } from "../group/Group.js";
import type { BasicMergeState, GroupContainerState } from "./BasicMergeState.js";

export class Containers {
  static getCommonContainers(ms: BasicMergeState, a: Group, b: Group): Set<Rectangular> {
    let ac: Set<Rectangular> = new Set(ms.getContainersFor(a)?.keys() ?? []);
    let bc: Set<Rectangular> = new Set(ms.getContainersFor(b)?.keys() ?? []);
    while (true) {
      if (ac.size === 0 || bc.size === 0) throw new LogicException("Group has no containers?");

      const intersect = new Set([...ac].filter((x) => bc.has(x)));

      if (intersect.size > 0) {
        return intersect;
      }

      ac = withParents(ac);
      bc = withParents(bc);
    }
  }

  /**
   * Attempts to find live containers shared by both a and b.
   */
  static getCommonLiveContainers(ms: BasicMergeState, a: Group, b: Group): Set<Rectangular> {
    const cc = Containers.getCommonContainers(ms, a, b);
    return Containers.getLiveContainers(ms, cc);
  }

  static getLiveContainers(ms: BasicMergeState, cc: Iterable<Rectangular>): Set<Rectangular> {
    return new Set([...cc].filter((it) => ms.isContainerLive(it)));
  }

  static hasCommonLiveContainer(ms: BasicMergeState, a: Group, b: Group): boolean {
    return Containers.getCommonLiveContainers(ms, a, b).size > 0;
  }

  /**
   * If the resulting group is going to end up with more live containers than a or b individually,
   * return true.
   */
  static increasesContainers(ms: BasicMergeState, a: Group | null, b: Group | null): boolean {
    const ac = ms.getContainersFor(a);
    const bc = ms.getContainersFor(b);
    return hasDifferentContainers(ac, bc) && hasDifferentContainers(bc, ac);
  }
}

function withParents(s: Set<Rectangular>): Set<Rectangular> {
  const out = new Set(s);
  for (const it of s) {
    const p = it.getContainer();
    if (p != null) out.add(p);
  }
  return out;
}

function hasDifferentContainers(
  ac: ReadonlyMap<Rectangular, GroupContainerState | null> | null,
  bc: ReadonlyMap<Rectangular, GroupContainerState | null> | null,
): boolean {
  for (const container of ac!.keys()) {
    if (bc!.get(container) == null) {
      return true;
    }
  }
  return false;
}
