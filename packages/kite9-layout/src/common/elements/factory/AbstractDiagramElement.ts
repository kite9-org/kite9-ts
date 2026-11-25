import {
  DiagramElementType,
  type Connection,
  type DiagramElement,
  type Rectangular,
  type RenderingInformation,
} from "@kite9/model";
import { stringHashCode } from "../../equality.js";

export abstract class AbstractDiagramElement implements DiagramElement {
  private depth = -1;
  private hc: number | null = null;

  constructor(private readonly p: DiagramElement | null) {}

  abstract getID(): string;
  abstract getType(): DiagramElementType;
  abstract getRenderingInformation(): RenderingInformation;
  abstract getContainer(): Rectangular | null;

  compareTo(other: DiagramElement): number {
    const a = this.getID();
    const b = other.getID();
    return a < b ? -1 : a > b ? 1 : 0;
  }

  hashCode(): number {
    if (this.hc === null) {
      this.hc = stringHashCode(this.getID());
    }
    return this.hc;
  }

  getDepth(): number {
    if (this.depth === -1) {
      const parent = this.getParent();
      this.depth =
        this.getType() === DiagramElementType.DIAGRAM || parent == null
          ? 0
          : parent.getDepth() + 1;
    }
    return this.depth;
  }

  /** Used to keep track of any connections we find in the diagram during initialisation. */
  protected registerConnection(de: Connection): void {
    (this.getParent() as AbstractDiagramElement).registerConnection(de);
  }

  getParent(): DiagramElement | null {
    return this.p;
  }
}
