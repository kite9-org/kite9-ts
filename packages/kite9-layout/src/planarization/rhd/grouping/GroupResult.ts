import type { Rectangular } from "@kite9/model";
import type { Group } from "./basic/group/Group.js";

/** Kotlin `GroupResult.ContainerStateInfo` (an inner class); registers itself in `containerStates`. */
export class ContainerStateInfo {
  readonly contents: Set<Group> = new Set();
  readonly incompleteSubcontainers: Set<Rectangular> = new Set<Rectangular>();
  done = false;

  constructor(c: Rectangular, containerStates: Map<Rectangular, ContainerStateInfo>) {
    containerStates.set(c, this);
  }
}

/**
 * Returns details of the state of the merge, and the grouping of each container.
 * A "live" group is one which is able to be merged (as opposed to already merged).
 */
export abstract class GroupResult {
  protected readonly containerStates: Map<Rectangular, ContainerStateInfo> = new Map();

  abstract groups(): Iterable<Group>;

  getStateFor(c: Rectangular): ContainerStateInfo | null {
    return this.containerStates.get(c) ?? null;
  }

  getContainers(): Rectangular[] {
    return [...this.containerStates.keys()];
  }
}
