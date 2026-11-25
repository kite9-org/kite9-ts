import { Direction, type DiagramElement } from "@kite9/model";
import type { DiagramElementFactory } from "../../../../common/elements/factory/DiagramElementFactory.js";
import type { GridPositioner } from "../../../../common/elements/grid/GridPositioner.js";
import { LogicException } from "../../../../logging/LogicException.js";
import type { ContradictionHandler } from "../../links/ContradictionHandler.js";
import { AbstractGroupingStrategy } from "../basic/AbstractGroupingStrategy.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { MergePlane } from "./MergePlane.js";
import { PriorityRule } from "./PriorityRule.js";
import { DirectedGroupAxis } from "./group/DirectedGroupAxis.js";
import { DirectedLinkManager } from "./group/DirectedLinkManager.js";
import type { DirectedMergeState } from "./merge/DirectedMergeState.js";

/**
 * This class encapsulates the rules about directional merging.
 *
 * When groups have directional edges, they will need to be merged in both axes.  The DirectedGroupTypeState
 * stores the state of this.
 *
 * If directional merging is going on (X_FIRST, Y_FIRST), groups need to exhaust the single directed merges in a given
 * direction first, before beginning the single directed merges in the other direction.
 *
 * If all single directed merges are exhausted, groups may buddy merge.  That is, where two groups
 * have a common neighbour in the same direction, they can merge together, which means that the common neighbour
 * now has a single group to merge with.
 *
 * Where groups don't have directed edges leaving them (UNDIRECTED), they can merge happily with any group not doing X_FIRST or Y_FIRST
 * merging.
 *
 * When all the directed edges are consumed and merged into single X_FIRST and Y_FIRST groups, those
 * are themselves merged together into a compound group (UNDIRECTED).
 *
 * About Axis / Perpendicular:
 *
 * Let's say we are doing Y-first merge.  The axis is vertical.  The axis part of the merge is about creating columns through the diagram
 * where things are aligned.   The perpendicular part is then about grouping those columns together.
 * The requirements are different in each case.  Axis merging is all about creating columns, so it's more interested in single directed merges.
 * However, perpendicular is all about keeping containers together, so priorities are based on whether you are completing a container or not.
 *
 * @author robmoffat
 */
export abstract class AbstractRuleBasedGroupingStrategy extends AbstractGroupingStrategy {
  // different types of merges get different priorities.
  static AXIS_SINGLE_NEIGHBOUR = 0;
  static AXIS_ALIGNED = 1;
  static AXIS_MULTI_NEIGHBOUR = 2;
  static PERP_NEIGHBOUR = 3;
  static PERP_ALIGNED = 4;
  static AXIS_ALIGNED_UNSURE = 5;
  static UNDIRECTED_LINKED = 6;
  static UNDIRECTED_ALIGNED = 7;
  static UNCONNECTED_NEIGHBOUR = 8;

  constructor(
    top: DiagramElement,
    elements: number,
    ch: ContradictionHandler,
    gp: GridPositioner,
    ef: DiagramElementFactory<unknown>,
  ) {
    super(top, elements, ch, gp, ef);
  }

  override canGroupsMerge(
    a: Group,
    b: Group,
    ms: BasicMergeState,
    alignedGroupIn: Group | null,
    alignedSide: Direction | null,
  ): number {
    const alignedGroup = alignedGroupIn != null ? this.getWorkingGroup(alignedGroupIn) : null;
    const out = super.canGroupsMerge(a, b, ms, alignedGroup, alignedSide);
    if (out === AbstractGroupingStrategy.INVALID_MERGE) {
      return out;
    }
    const plane = DirectedGroupAxis.getMergePlane(a, b);
    if (plane == null || this.alreadyMerged(a, plane) || this.alreadyMerged(b, plane)) {
      // means that the groups are now incompatible.
      return AbstractGroupingStrategy.INVALID_MERGE;
    }

    // if there is a contradiction, record it and quit
    const hasContradiction = this.checkContradiction(a, b, plane);
    if (hasContradiction) {
      return AbstractGroupingStrategy.ILLEGAL_PRIORITY;
    }

    // figure out if the axis is horizontal or vertical first.
    let horizontalMergesFirst = true;
    if (
      DirectedGroupAxis.getType(a).state === MergePlane.Y_FIRST_MERGE ||
      DirectedGroupAxis.getType(b).state === MergePlane.Y_FIRST_MERGE ||
      plane === MergePlane.Y_FIRST_MERGE
    ) {
      horizontalMergesFirst = false;
    }
    const dms = ms as DirectedMergeState;
    for (const pr of this.getRules(dms)) {
      const p = pr.getMergePriority(a, b, dms, alignedGroup, alignedSide, plane, horizontalMergesFirst);
      if (p !== PriorityRule.UNDECIDED) {
        return p;
      }
    }
    return AbstractGroupingStrategy.ILLEGAL_PRIORITY;
  }

  private alreadyMerged(b: Group, plane: MergePlane): boolean {
    if (plane === MergePlane.X_FIRST_MERGE) {
      return b.axis.getParentGroup(false) != null;
    } else if (plane === MergePlane.Y_FIRST_MERGE) {
      return b.axis.getParentGroup(true) != null;
    } else {
      return false;
    }
  }

  protected abstract getRules(ms: DirectedMergeState): PriorityRule[];

  getWorkingGroup(groupIn: Group | null): Group | null {
    if (groupIn == null) return null;
    let group: Group = groupIn;
    let parent: Group | null = null;
    do {
      if (parent != null) {
        group = parent;
      }
      const axis = group.axis as DirectedGroupAxis;
      switch (axis.state) {
        case MergePlane.X_FIRST_MERGE:
          parent = axis.vertParentGroup;
          break;
        case MergePlane.Y_FIRST_MERGE:
          parent = axis.horizParentGroup;
          break;
        default:
          if (axis.horizParentGroup !== axis.vertParentGroup) {
            throw new LogicException("Not decided");
          }
          parent = axis.horizParentGroup;
      }
    } while (parent != null);
    return group;
  }

  private checkContradiction(a: Group, b: Group, axis: MergePlane): boolean {
    const directedEdgesOnly = DirectedLinkManager.createMask(
      axis,
      false,
      false,
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    );
    const blm = b.linkManager;
    const subset = a.linkManager.subset(directedEdgesOnly);
    for (const gald of subset) {
      const gbld = blm.get(gald.group!);
      if (gbld != null && gbld.direction != null && gbld.direction !== gald.direction) {
        return true;
      }
    }
    return false;
  }
}
