import { reverseDirection, type Direction } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { LinkProcessor } from "../../links/LinkManager.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { mergePlaneMatches, type MergePlane } from "../directed/MergePlane.js";
import { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import { AbstractWaitingContainerMergeGenerator } from "./AbstractWaitingContainerMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

/**
 * Generates merge options where the group passed in is a member of the alignedGroup, g1, or g2 trio.
 * Sadly, this involves a lot more iteration than a g1 + g2 duo.
 *
 * @author robmoffat
 */
export abstract class AbstractAlignedMergeGenerator extends AbstractWaitingContainerMergeGenerator {
  constructor(
    gp: GroupPhase,
    ms: BasicMergeState,
    grouper: GeneratorBasedGroupingStrategy,
    liveOnly: boolean,
  ) {
    super(gp, ms, grouper, liveOnly);
  }

  protected abstract getAlignmentDirections(g1: Group): ReadonlySet<Direction | null>;

  protected abstract processPossibleAligningGroups(g1: Group, d: Direction, lp: LinkProcessor): void;

  generate(poll: Group): void {
    this.log.send(this.log.go() ? null : "Generating " + this.getCode() + " options for " + poll);
    const alignmentDirections = this.getAlignmentDirections(poll);
    for (const d of alignmentDirections) {
      this.generateFromAlignedGroup(poll, d, this.ms);
      this.generateFromG1Group(poll, d, this.ms);
    }
  }

  protected generateFromAlignedGroup(
    alignedGroup: Group,
    d: Direction | null,
    ms: BasicMergeState,
  ): void {
    const axis = DirectedGroupAxis.getType(alignedGroup);
    const mp = DirectedGroupAxis.getState(alignedGroup);
    this.processAlignedGroupsInAxis(alignedGroup, ms, axis, mp, d, {
      process: (_originatingGroup, g1w, _ld) => {
        const g1 = this.grouper.getWorkingGroup(g1w)!;
        const g1state = DirectedGroupAxis.getState(g1);
        if (ms.isLiveGroup(g1) && mergePlaneMatches(mp, g1state)) {
          this.processAlignedGroupsInAxis(alignedGroup, ms, axis, mp, d, {
            process: (_originatingGroup2, g2, _ld2) => {
              if (g2.groupNumber > g1.groupNumber) {
                this.testAndAddAlignedTrio(g1, g2, alignedGroup, d, mp);
              }
            },
          });
        }
      },
    });
  }

  protected generateFromG1Group(g1: Group, d: Direction | null, ms: BasicMergeState): void {
    const axis = DirectedGroupAxis.getType(g1);
    const mp = DirectedGroupAxis.getState(g1);
    this.processAlignedGroupsInAxis(g1, ms, axis, mp, d, {
      process: (_originatingGroup, alignedGroupw, _ld) => {
        const alignedGroup = this.grouper.getWorkingGroup(alignedGroupw)!;
        const rd = reverseDirection(d);

        this.processAlignedGroupsInAxis(alignedGroup, ms, axis, mp, rd, {
          process: (_originatingGroup2, g2, _ld2) => {
            this.testAndAddAlignedTrio(g1, g2, alignedGroup, rd, mp);
          },
        });
      },
    });
  }

  protected testAndAddAlignedTrio(
    g1: Group,
    g2: Group,
    alignedGroup: Group,
    alignedSide: Direction | null,
    mp: MergePlane,
  ): void {
    const g2w = this.grouper.getWorkingGroup(g2)!;
    const g2state = DirectedGroupAxis.getState(g2w);
    if (g2w !== g1 && this.ms.isLiveGroup(g2w) && mergePlaneMatches(mp, g2state)) {
      this.addMergeOption(g1, g2w, alignedGroup, alignedSide);
    }
  }

  protected abstract processAlignedGroupsInAxis(
    alignedGroup: Group,
    ms: BasicMergeState,
    axis: DirectedGroupAxis,
    mp: MergePlane,
    d: Direction | null,
    lp: LinkProcessor,
  ): void;
}
