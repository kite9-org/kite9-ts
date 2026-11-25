import { DiagramElementType, Dimension } from "@kite9/model";
import type { DiagramElement, Label, Rectangular } from "@kite9/model";
import { isConnectedRectangular, isRectangular } from "../../common/elements/TypeGuards.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { ElementSizer } from "../../sizer.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import type { Aligner } from "./Aligner.js";

function isLabel(de: DiagramElement): de is Label {
  return de.getType() === DiagramElementType.LABEL;
}

/**
 * At the moment, this passes through each aligner in turn, from top-to-bottom of the diagram.
 */
export class AlignmentCompactionStep extends AbstractCompactionStep {
  constructor(
    cd: ElementSizer,
    private readonly aligners: readonly Aligner[],
  ) {
    super(cd);
  }

  get prefix(): string {
    return "ALN ";
  }

  compact(c: Compaction, _g: Group): void {
    this.alignContents(c.getDiagram(), c, Dimension.H);
    this.alignContents(c.getDiagram(), c, Dimension.V);
  }

  private alignContents(de: Rectangular, c: Compaction, d: Dimension): void {
    const contents = de.getContents();
    for (const a of this.aligners) {
      this.alignConnecteds(c, contents, a, d, de);
      this.alignLabels(c, contents, a, d, de);
    }
    for (const de2 of contents) {
      if (isRectangular(de2)) {
        this.alignContents(de2, c, d);
      }
    }
  }

  private alignConnecteds(
    c: Compaction,
    contents: readonly DiagramElement[],
    a: Aligner,
    d: Dimension,
    de: Rectangular,
  ): void {
    const filtered = new Set<Rectangular>(
      contents.filter(isConnectedRectangular).filter((it) => a.willAlign(it, d)),
    );
    if (filtered.size > 0) {
      a.alignFor(de, filtered, c, d);
    }
  }

  private alignLabels(
    c: Compaction,
    contents: readonly DiagramElement[],
    a: Aligner,
    d: Dimension,
    de: Rectangular,
  ): void {
    const filtered = new Set<Rectangular>(
      contents.filter(isLabel).filter((it) => a.willAlign(it, d)),
    );
    if (filtered.size > 0) {
      a.alignFor(de, filtered, c, d);
    }
  }
}
