import type { Direction, Rectangular } from "@kite9/model";
import { kite9Log, type Kite9Log } from "../../../../logging/Kite9Log.js";
import type { Logable } from "../../../../logging/Logable.js";
import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";
import type { MergeGenerator } from "./MergeGenerator.js";

export abstract class AbstractMergeGenerator implements MergeGenerator, Logable {
  protected log: Kite9Log = kite9Log(this);

  constructor(
    readonly gp: GroupPhase,
    readonly ms: BasicMergeState,
    readonly grouper: GeneratorBasedGroupingStrategy,
  ) {}

  abstract generate(poll: Group): void;

  addMergeOption(
    g1: Group,
    g2: Group,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
  ): void {
    this.grouper.addMergeOption(g1, g2, alignedGroup, alignedSide, this.getMyBestPriority(), this.ms);
  }

  get prefix(): string {
    return "MG  ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  protected abstract getMyBestPriority(): number;

  containerIsLive(_c: Rectangular): void {}

  abstract getCode(): string;
}
