import { Layout, reverseDirection, type DiagramElement, type Rectangular } from "@kite9/model";
import type { DiagramElementFactory } from "../../../../common/elements/factory/DiagramElementFactory.js";
import type { GridPositioner } from "../../../../common/elements/grid/GridPositioner.js";
import { isConnectedRectangular } from "../../../../common/elements/TypeGuards.js";
import { LogicException } from "../../../../logging/LogicException.js";
import { GroupPhase } from "../../GroupPhase.js";
import type { ContradictionHandler } from "../../links/ContradictionHandler.js";
import type { LinkDetail, LinkProcessor } from "../../links/LinkManager.js";
import type { GroupLinkNode } from "../GroupLinkNode.js";
import type { CompoundGroup } from "../basic/group/CompoundGroup.js";
import type { Group } from "../basic/group/Group.js";
import type { LeafGroup } from "../basic/group/LeafGroup.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { Containers } from "../basic/merge/Containers.js";
import type { MergeOption } from "../basic/merge/MergeOption.js";
import { AbstractRuleBasedGroupingStrategy } from "./AbstractRuleBasedGroupingStrategy.js";
import { MergePlane } from "./MergePlane.js";
import { DirectedCompoundGroup } from "./group/DirectedCompoundGroup.js";
import { DirectedGroupAxis } from "./group/DirectedGroupAxis.js";
import { DirectedLeafGroup } from "./group/DirectedLeafGroup.js";
import type { DirectedLinkManager } from "./group/DirectedLinkManager.js";
import type { DirectedMergeState } from "./merge/DirectedMergeState.js";

/**
 * For directed merges, this strategy allows groups to be created which run x-axis-first
 * merging and y-axis-first merging, and then once directed merges are exhausted for both,
 * combines them together.
 *
 * @author robmoffat
 */
export abstract class AxisHandlingGroupingStrategy extends AbstractRuleBasedGroupingStrategy {
  static LAST_MERGE_DEBUG: string | null = null;

  constructor(
    top: DiagramElement,
    elements: number,
    ch: ContradictionHandler,
    gp: GridPositioner,
    ef: DiagramElementFactory<unknown>,
    readonly ms: DirectedMergeState,
  ) {
    super(top, elements, ch, gp, ef);
    if (!this.log.go()) {
      AxisHandlingGroupingStrategy.LAST_MERGE_DEBUG = "";
    } else {
      AxisHandlingGroupingStrategy.LAST_MERGE_DEBUG = null;
    }
  }

  protected override groupChangedContainer(_ms: BasicMergeState, g: Group): void {
    g.linkManager.notifyContainerChange();
    g.processAllLeavingLinks(true, g.linkManager.allMask(), {
      process: (_originatingGroup, destinationGroup, _ld) => {
        destinationGroup.linkManager.notifyContainerChange(g);
      },
    });
  }

  protected override createMergedCompoundGroup(
    ms: BasicMergeState,
    mo: MergeOption,
  ): CompoundGroup {
    const out = this.createCompoundGroup(mo.mk.a, mo.mk.b, false, mo);
    this.identifyGroupDirection(out, ms);

    this.log.send(
      this.log.go()
        ? null
        : `Compound Group ${out.groupNumber} created: \n\t${out.a}\n\t${out.b}\n\t${out.layout}\n\taxis:${out.axis}\n\tlinks:`,
      (out.linkManager as DirectedLinkManager).links,
    );

    this.writeGroup(out, mo);
    return out;
  }

  private checkForInternalContradictions(
    out: CompoundGroup,
    ld1: LinkDetail | null,
    ld2: LinkDetail | null,
    ms: BasicMergeState,
  ): void {
    if (ld1 == null && ld2 == null) {
      return;
    }

    // added for contradictions - break the least important one first.
    const ld = ld1!.linkRank > ld2!.linkRank ? ld2! : ld1!;

    // check that internals don't contradict the axis of the group
    if (this.isLinkAgainstAxis(out, ld)) {
      const aContainerMap = ms.getContainersFor(out.a)!;
      const bContainerMap = ms.getContainersFor(out.b)!;
      const expandingContainers: Set<Rectangular> = new Set<Rectangular>();
      for (const k of aContainerMap.keys()) {
        if (bContainerMap.has(k)) expandingContainers.add(k);
      }

      const isParentOrSelf = (x: DiagramElement | null, parent: DiagramElement): boolean => {
        if (x === parent) {
          return true;
        } else if (x == null) {
          return false;
        } else {
          return isParentOrSelf(x.getContainer(), parent);
        }
      };

      const getFirstExpandingContainer = (from: Rectangular | null): Rectangular | null => {
        if (from != null && expandingContainers.has(from)) {
          return from;
        } else if (isConnectedRectangular(from)) {
          return getFirstExpandingContainer(from.getContainer());
        } else {
          return null;
        }
      };

      /**
       * The aim of this test is to make sure we don't allow a container to be non-square
       */
      const axisChecker: LinkProcessor = {
        process: (originatingGroup, destinationGroup, ld3) => {
          if (this.isLinkAgainstAxis(out, ld3)) {
            const from = (originatingGroup as LeafGroup).container;
            const to = (destinationGroup as LeafGroup).container;
            const fromExpanded = getFirstExpandingContainer(from);
            const toExpanded = getFirstExpandingContainer(to);
            if (fromExpanded != null && !isParentOrSelf(to, fromExpanded)) {
              // from has been expanded, from outside itself
              ms.contradictionHandler.setContradicting(ld3.connections, false);
              return;
            }
            if (toExpanded != null && !isParentOrSelf(from, toExpanded)) {
              // from has been expanded, from outside itself
              ms.contradictionHandler.setContradicting(ld3.connections, false);
              return;
            }
          }
        },
      };
      ld1!.processLowestLevel(axisChecker);
    }
  }

  private isLinkAgainstAxis(out: CompoundGroup, ld: LinkDetail): boolean {
    return (
      (DirectedGroupAxis.getState(out) === MergePlane.X_FIRST_MERGE &&
        GroupPhase.isVerticalDirection(ld.direction)) ||
      (DirectedGroupAxis.getState(out) === MergePlane.Y_FIRST_MERGE &&
        GroupPhase.isHorizontalDirection(ld.direction))
    );
  }

  identifyGroupDirection(out: CompoundGroup, ms: BasicMergeState): void {
    const c = Containers.getCommonContainers(ms, out.a, out.b);
    const layoutDirection = this.getAxisLayoutForContainers(c);
    const lda = out.internalLinkA;
    const ldb = out.internalLinkB;
    this.checkForInternalContradictions(out, out.internalLinkA, out.internalLinkB, ms);
    if (lda != null && ldb != null) {
      const layout = GroupPhase.getLayoutForDirection(
        ms.contradictionHandler.checkContradiction(
          lda.direction,
          lda.isOrderingLink,
          lda.linkRank,
          lda.connections,
          reverseDirection(ldb.direction),
          ldb.isOrderingLink,
          ldb.linkRank,
          ldb.connections,
          layoutDirection,
        ),
      );
      out.layout = layout;
    } else if (lda != null) {
      out.layout = GroupPhase.getLayoutForDirection(lda.direction);
    } else if (ldb != null) {
      out.layout = GroupPhase.getLayoutForDirection(ldb.direction);
    }

    // we may be able to establish a layout from one or more of the
    // containers that the groups are in.  Layout will be horizontal or vertical,
    // unless there is a contradiction.
    if (out.layout == null) {
      out.layout = layoutDirection;
    } else if (out.layout === Layout.UP || out.layout === Layout.DOWN) {
      if (layoutDirection === Layout.HORIZONTAL) {
        out.layout = Layout.HORIZONTAL;
      }
    } else if (out.layout === Layout.LEFT || out.layout === Layout.RIGHT) {
      if (layoutDirection === Layout.VERTICAL) {
        out.layout = Layout.VERTICAL;
      }
    } else if (out.layout !== layoutDirection) {
      throw new LogicException("Layout contradiction");
    }
  }

  private getAxisLayoutForContainers(cc: Set<Rectangular>): Layout | null {
    if (cc.size === 0) return null;

    const layoutDirections = [...cc].map((c) => {
      // sanitize to a single axis
      const layoutDirection = c.getLayout();
      switch (layoutDirection) {
        case Layout.LEFT:
        case Layout.RIGHT:
          return Layout.HORIZONTAL;
        case Layout.UP:
        case Layout.DOWN:
          return Layout.VERTICAL;
        default:
          return layoutDirection;
      }
    });

    // ok, so we should have either nulls, horizontals or verticals only.
    if (layoutDirections.includes(Layout.HORIZONTAL) && layoutDirections.includes(Layout.VERTICAL)) {
      throw new LogicException("Two live containers with conflicting layouts - not handled yet");
    }

    return layoutDirections.find((it) => it != null) ?? null;
  }

  private writeGroup(g: CompoundGroup, mo: MergeOption): void {
    if (!this.log.go()) {
      AxisHandlingGroupingStrategy.LAST_MERGE_DEBUG = `${AxisHandlingGroupingStrategy.LAST_MERGE_DEBUG}${g.groupNumber}\t${g.a}\t${g.b}\t${g.axis}\t${mo.priority}\n`;
    }
  }

  /**
   * Once all the directed merges have been completed for a group, (say X_FIRST) it should
   * be merged with the group going the other way (Y_FIRST) if possible.
   */
  protected checkForCompleteAxisMerges(ms: BasicMergeState, a: Group): void {
    const dms = ms as DirectedMergeState;
    if (dms.completedDirectionalMerge(a)) {
      const b = dms.getCompoundGroupWithSameContents(a);
      if (b != null && b !== a) {
        // perform the merge in a fairly normal way.
        const out = this.createCompoundGroup(a, b, true, null, a.size);
        const axis = out.axis as DirectedGroupAxis;
        const lm = out.linkManager as DirectedLinkManager;
        axis.isHorizontal = false;
        axis.isVertical = false;
        axis.state = MergePlane.UNKNOWN;

        this.log.send(
          this.log.go()
            ? null
            : `Compound Group ${out.groupNumber} created: \n\t${out.a}\n\t${out.b}\n\t NON-LAYOUT \n\taxis:${out.axis}\n\tlinks:`,
          lm.links,
        );

        this.setBothParents(out, a.axis as DirectedGroupAxis);
        this.setBothParents(out, b.axis as DirectedGroupAxis);
        this.doCompoundGroupInsertion(ms, out, true);
      }
    }
  }

  protected override doCompoundGroupInsertion(
    ms: BasicMergeState,
    combined: CompoundGroup,
    skipContainerCompletionCheck: boolean,
  ): void {
    super.doCompoundGroupInsertion(ms, combined, skipContainerCompletionCheck);
    if (!skipContainerCompletionCheck) {
      this.checkForCompleteAxisMerges(ms, combined);
    }
  }

  /**
   * When a merge option creates a horizontal or vertical combined group, then
   * the underlying groups are not removed necessarily - they are kept around
   * so that they can be merged in the other direction.
   */
  protected override removeOldGroups(ms: BasicMergeState, combined: CompoundGroup): void {
    this.checkRemoveGroup(combined.a, combined, ms);
    this.checkRemoveGroup(combined.b, combined, ms);
  }

  private checkRemoveGroup(a: Group, cg: CompoundGroup, ms: BasicMergeState): void {
    const aType = DirectedGroupAxis.getType(a);
    const cgType = DirectedGroupAxis.getType(cg);
    if (cgType.state === MergePlane.X_FIRST_MERGE) {
      aType.vertParentGroup = cg;
      if (aType.state === MergePlane.X_FIRST_MERGE || aType.state === MergePlane.Y_FIRST_MERGE) {
        aType.active = false;
        if (aType.horizParentGroup == null) {
          aType.horizParentGroup = cg;
        }
      } else {
        aType.state = MergePlane.Y_FIRST_MERGE;
        this.axisChanged(a);
      }
    } else if (cgType.state === MergePlane.Y_FIRST_MERGE) {
      aType.horizParentGroup = cg;
      if (aType.state === MergePlane.X_FIRST_MERGE || aType.state === MergePlane.Y_FIRST_MERGE) {
        aType.active = false;
        if (aType.vertParentGroup == null) {
          aType.vertParentGroup = cg;
        }
      } else {
        aType.state = MergePlane.X_FIRST_MERGE;
        this.axisChanged(a);
      }
    } else {
      // undirected / single axis merge
      this.setBothParents(cg, aType);
    }
    if (!aType.active) {
      ms.removeLiveGroup(a);
    } else {
      // group is being kept, so we need to make sure it's in the group
      // lists
      ms.addLiveGroup(a);
    }
  }

  private setBothParents(cg: CompoundGroup, aType: DirectedGroupAxis): void {
    aType.horizParentGroup = cg;
    aType.vertParentGroup = cg;
    aType.active = false;
  }

  private axisChanged(a: Group): void {
    a.linkManager.notifyAxisChange();
  }

  override createLeafGroup(gln: GroupLinkNode, ord: Rectangular): LeafGroup {
    this.containerCount++;
    const out = new DirectedLeafGroup(
      gln,
      ord,
      this.groupCount,
      this.nextHashCode(),
      this.log,
      this.ms,
    );
    this.groupCount++;
    this.allGroups.add(out);
    return out;
  }

  override createCompoundGroup(
    a: Group,
    b: Group,
    treatAsComplete: boolean,
    mo: MergeOption | null,
    size: number = a.size + b.size,
  ): CompoundGroup {
    // this is done so that a different compound group containing the same leaves can
    // occupy the same position in a hashmap
    const hashCode = !treatAsComplete
      ? (a.hashCode() + b.hashCode()) | 0
      : this.nextHashCode();
    const out = new DirectedCompoundGroup(
      a,
      b,
      treatAsComplete,
      this.groupCount,
      size,
      hashCode,
      this.ms,
      this.log,
      mo?.alignedDirection ?? null,
    );
    this.groupCount++;
    return out;
  }

  protected override isContainerCompleteInner(c: Rectangular, ms: BasicMergeState): boolean {
    const csi = ms.getStateFor(c)!;
    if (csi.contents.size < 2) {
      csi.done = true;
      return true;
    }
    if (csi.contents.size > 2) {
      return false;
    }

    // test one of each axis
    const groups = csi.contents.values();
    const first = groups.next().value!;
    const second = groups.next().value!;
    const fax = DirectedGroupAxis.getState(first);
    const sax = DirectedGroupAxis.getState(second);
    return (
      (fax === MergePlane.X_FIRST_MERGE && sax === MergePlane.Y_FIRST_MERGE) ||
      (fax === MergePlane.Y_FIRST_MERGE && sax === MergePlane.X_FIRST_MERGE)
    );
  }
}
