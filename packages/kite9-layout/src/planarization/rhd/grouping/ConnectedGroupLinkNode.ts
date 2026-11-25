import { ConnectionsSeparation, DiagramElementType, PLACEMENT_NONE } from "@kite9/model";
import type {
  Connected,
  Connection,
  Dimension,
  PlacementPositioned,
  Placement,
  RectangleRenderingInformation,
  Rectangular,
  Temporary,
} from "@kite9/model";
import { AbstractDiagramElement } from "../../../common/elements/factory/AbstractDiagramElement.js";
import { RectangleRenderingInformationImpl } from "../../../common/elements/RectangleRenderingInformationImpl.js";
import { isAlignedRectangular, isConnected } from "../../../common/elements/TypeGuards.js";
import type { GroupLinkNode } from "./GroupLinkNode.js";

/**
 * This is created for containers that need to participate in grouping,
 * because they have either directed connections arriving at them or they are
 * involved in layouts, but they also have contents that are involved in
 * layouts too.
 */
export class ConnectedGroupLinkNode
  extends AbstractDiagramElement
  implements PlacementPositioned, GroupLinkNode, Temporary
{
  readonly id: string;

  readonly links: Connection[] = [];

  constructor(
    readonly c: Rectangular,
    suffix: string,
    readonly gridPosition: readonly [number, number] | null = null,
  ) {
    super(c);
    this.id = c.getID() + "-" + suffix;
  }

  getType(): DiagramElementType {
    return DiagramElementType.CONNECTED_RECTANGULAR;
  }

  getContainerPosition(d: Dimension): Placement {
    if (isAlignedRectangular(this.c)) {
      const ca = this.c.getConnectionAlignment(d);
      if (ca != null) {
        return ca;
      }
    }

    return PLACEMENT_NONE; // default, middle of the container
  }

  getRenderingInformation(): RectangleRenderingInformation {
    return new RectangleRenderingInformationImpl(null, null, false);
  }

  getContainer(): Rectangular {
    return this.c;
  }

  getID(): string {
    return this.id;
  }

  getLinks(): ReadonlyArray<Connection> {
    return this.links;
  }

  isConnectedDirectlyTo(c: Connected): boolean {
    return this.links.some((link) => link.meets(c));
  }

  getConnectionsSeparationApproach(): ConnectionsSeparation {
    if (isConnected(this.c)) {
      return this.c.getConnectionsSeparationApproach();
    } else {
      return ConnectionsSeparation.SAME_SIDE;
    }
  }

  toString(): string {
    return "[hub-temporary: " + this.getID() + "]";
  }
}
