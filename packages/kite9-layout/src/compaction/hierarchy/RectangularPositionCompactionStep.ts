import { Dimension, Measurement } from "@kite9/model";
import type { DiagramElement, Dimension2D, Placement, Port, Rectangular } from "@kite9/model";
import { isConnection, isPort, isRectangular } from "../../common/elements/TypeGuards.js";
import { BasicDimension2DImpl, CostedDimension2DImpl } from "../../common/objects/Dimension2DImpl.js";
import { LogicException } from "../../logging/LogicException.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import { Side } from "../Side.js";

export class RectangularPositionCompactionStep extends AbstractCompactionStep {
  compact(c: Compaction, _g: Group): void {
    this.visit(c.getDiagram(), c);
  }

  private visit(r: Rectangular, c: Compaction): void {
    this.log.send(`Positioning ${r}`);
    const ssy = c.getSlackOptimisation(Dimension.H).getSlideablesFor(r);
    const ssx = c.getSlackOptimisation(Dimension.V).getSlideablesFor(r);
    if (ssy != null && ssx != null) {
      const xMin = this.getSlideable(r, Side.START, ssy)!.minimumPosition;
      const xMax = this.getSlideable(r, Side.END, ssy)!.minimumPosition;
      const yMin = this.getSlideable(r, Side.START, ssx)!.minimumPosition;
      const yMax = this.getSlideable(r, Side.END, ssx)!.minimumPosition;
      const rri = r.getRenderingInformation();
      const position = new BasicDimension2DImpl(xMin, yMin);
      rri.position = position;
      const size: Dimension2D = new BasicDimension2DImpl(xMax - xMin, yMax - yMin);
      if (size.w < 0 || size.h < 0) {
        throw new LogicException("Slideable issue");
      }
      rri.size = size;

      for (const it of r.getContents()) {
        if (isPort(it)) this.visitPort(it, c, position, size);
      }
    }

    for (const it of r.getContents()) {
      if (isRectangular(it)) this.visit(it, c);
    }

    for (const conn of r.getContents()) {
      if (isConnection(conn)) {
        const from = conn.getFromLabel();
        if (from != null) this.visit(from, c);
        const to = conn.getToLabel();
        if (to != null) this.visit(to, c);
      }
    }
  }

  private visitPort(p: Port, c: Compaction, position: Dimension2D, size: Dimension2D): void {
    const ppX = p.getContainerPosition(Dimension.H);
    const ppY = p.getContainerPosition(Dimension.V);
    const ssx = c.getSlackOptimisation(Dimension.H).getPPSlideablesFor(p);
    const ssy = c.getSlackOptimisation(Dimension.V).getPPSlideablesFor(p);

    const portXPos =
      ssx != null ? ssx.c!.minimumPosition : this.measure(position.x(), size.x(), ppX);

    const portYPos =
      ssy != null ? ssy.c!.minimumPosition : this.measure(position.y(), size.y(), ppY);

    this.setPortPosition(p, portXPos, portYPos);
  }

  private setPortPosition(p: Port, x: number, y: number): void {
    const pos = p.getRenderingInformation().position;
    if (pos == null) {
      p.getRenderingInformation().position = new CostedDimension2DImpl(x, y);
      p.getRenderingInformation().size = new CostedDimension2DImpl(0.0, 0.0);
    }
  }

  private measure(start: number, size: number, pa: Placement): number {
    let unbounded: number;
    if (pa.type === Measurement.PERCENTAGE) {
      unbounded = start + (pa.amount / 100.0) * size;
    } else if (pa.amount > 0) {
      unbounded = start + pa.amount;
    } else {
      // measured from the end
      return start + size + pa.amount;
    }

    return Math.max(start, Math.min(unbounded, start + size));
  }

  private getSlideable(
    r: DiagramElement,
    s: Side,
    set: RectangularSlideableSet,
  ): CompactionSlideable | null {
    for (const x of set.getRectangularSlideables()) {
      if (x.getRectAnchors().some((it) => it.e === r && it.s === s)) {
        return x;
      }
    }
    return null;
  }

  get prefix(): string {
    return "RPCS";
  }
}
