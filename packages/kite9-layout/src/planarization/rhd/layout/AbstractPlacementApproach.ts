import { Layout } from "@kite9/model";
import type { Kite9Log } from "../../../logging/Kite9Log.js";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import type { PlacementApproach } from "./PlacementApproach.js";

export abstract class AbstractPlacementApproach implements PlacementApproach {
  score = 0.0;

  constructor(
    readonly log: Kite9Log,
    readonly aDirection: Layout | null,
    public overall: CompoundGroup,
    readonly natural: boolean,
  ) {}

  abstract evaluate(): void;

  choose(): void {
    this.overall.layout = this.aDirection;
    const reversed = this.aDirection === Layout.LEFT || this.aDirection === Layout.UP;
    const before = reversed ? this.overall.b : this.overall.a;
    const after = reversed ? this.overall.a : this.overall.b;
    this.log.send(
      this.log.go()
        ? null
        : `Placement ${this.aDirection} chosen for --- ${before}   ---     ${after}`,
    );
  }
}
