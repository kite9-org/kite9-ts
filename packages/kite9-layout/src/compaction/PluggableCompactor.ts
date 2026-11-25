import { Direction } from "@kite9/model";
import type { Diagram } from "@kite9/model";
import { kite9Log, type Kite9Log } from "../logging/Kite9Log.js";
import type { Logable } from "../logging/Logable.js";
import { LogicException } from "../logging/LogicException.js";
import type { Group } from "../planarization/rhd/grouping/basic/group/Group.js";
import type { GroupResult } from "../planarization/rhd/grouping/GroupResult.js";
import type { Compaction } from "./Compaction.js";
import type { CompactionStep } from "./CompactionStep.js";

/**
 * Superclass for all segment-based compaction methods.   The process works by converting each face into
 * a set of segments, where segments represent horizontal or vertical positions.
 *
 * @author robmoffat
 */
export class PluggableCompactor implements Logable {
  static readonly VERTICAL: ReadonlySet<Direction> = new Set([Direction.UP, Direction.DOWN]);
  static readonly HORIZONTAL: ReadonlySet<Direction> = new Set([Direction.LEFT, Direction.RIGHT]);

  private _log: Kite9Log | null = null;

  constructor(readonly steps: readonly CompactionStep[]) {}

  get log(): Kite9Log {
    return (this._log ??= kite9Log(this));
  }

  compactDiagram(_d: Diagram, gr: GroupResult, compaction: Compaction): void {
    const first = gr.groups()[Symbol.iterator]().next();
    if (first.done) {
      throw new LogicException("No groups to compact");
    }
    this.compact(compaction, first.value);
  }

  private compact(c: Compaction, g: Group): void {
    for (const step of this.steps) {
      try {
        step.compact(c, g);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  }

  get prefix(): string {
    return "C2PC";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }
}
