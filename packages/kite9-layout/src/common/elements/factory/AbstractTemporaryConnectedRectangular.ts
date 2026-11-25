import type {
  BorderTraversal,
  Connected,
  ConnectedRectangular,
  ConnectionsSeparation,
  Connection,
  ContainerPosition,
  DiagramElement,
  DiagramElementType,
  Dimension,
  Direction,
  Layout,
  RectangleRenderingInformation,
  Rectangular,
  Temporary,
} from "@kite9/model";
import { AbstractDiagramElement } from "./AbstractDiagramElement.js";
import type { TemporaryConnectedRectangular } from "./TemporaryConnectedRectangular.js";

export abstract class AbstractTemporaryConnectedRectangular
  extends AbstractDiagramElement
  implements TemporaryConnectedRectangular, ConnectedRectangular
{
  private readonly links: Connection[] = [];

  constructor(
    private readonly _id: string,
    private readonly rectParent: Rectangular,
  ) {
    super(rectParent);
  }

  // Remaining ConnectedRectangular members are supplied by the concrete subclass.
  abstract getType(): DiagramElementType.CONNECTED_RECTANGULAR;
  abstract getRenderingInformation(): RectangleRenderingInformation;
  abstract getContainerPosition(d: Dimension): ContainerPosition | null;
  abstract setContainerPosition(x: ContainerPosition, y: ContainerPosition): void;
  abstract getContents(): ReadonlyArray<DiagramElement>;
  abstract addTemporaryContent(t: Temporary): void;
  abstract getTraversalRule(d: Direction): BorderTraversal;
  abstract getLayout(): Layout | null;
  abstract getGridColumns(): number;
  abstract getGridRows(): number;
  abstract deepContains(d: DiagramElement): boolean;
  abstract getConnectionsSeparationApproach(): ConnectionsSeparation;
  abstract getLinkGutter(): number;
  abstract getLinkInset(): number;

  getLinks(): ReadonlyArray<Connection> {
    return this.links;
  }

  private firstConnectionTo(c: Connected): Connection | null {
    for (const link of this.getLinks()) {
      if (link.meets(c)) {
        return link;
      }
    }
    return null;
  }

  isConnectedDirectlyTo(c: Connected): boolean {
    return this.firstConnectionTo(c) !== null;
  }

  getContainer(): Rectangular {
    return this.getParent();
  }

  override getParent(): Rectangular {
    return this.rectParent;
  }

  getID(): string {
    return this._id;
  }
}
