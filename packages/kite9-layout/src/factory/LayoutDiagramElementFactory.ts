/** Minimal factory for layout temporaries (grid empty cells). */

import {
  BorderTraversal,
  ConnectionsSeparation,
  DiagramElementSizing,
  DiagramElementType,
  Dimension,
  type ConnectedRectangular,
  type ContainerPosition,
  type DiagramElement,
  type Direction,
  type Layout,
  type RectangleRenderingInformation,
  type Rectangular,
  type Temporary,
} from "@kite9/model";
import { AbstractTemporaryConnectedRectangular } from "../common/elements/factory/AbstractTemporaryConnectedRectangular.js";
import type { DiagramElementFactory } from "../common/elements/factory/DiagramElementFactory.js";
import type { ElementContext } from "../common/elements/factory/ElementContext.js";
import type { TemporaryConnectedRectangular } from "../common/elements/factory/TemporaryConnectedRectangular.js";
import { RectangleRenderingInformationImpl } from "../common/elements/RectangleRenderingInformationImpl.js";
import { BasicDimension2DImpl } from "../common/objects/Dimension2DImpl.js";

class LayoutTemporaryConnected extends AbstractTemporaryConnectedRectangular {
  private readonly ri = new RectangleRenderingInformationImpl();
  private containerPos: { x: ContainerPosition | null; y: ContainerPosition | null } =
    { x: null, y: null };

  getType(): DiagramElementType.CONNECTED_RECTANGULAR {
    return DiagramElementType.CONNECTED_RECTANGULAR;
  }

  getRenderingInformation(): RectangleRenderingInformation {
    return this.ri;
  }

  getContainerPosition(d: Dimension): ContainerPosition | null {
    return d === Dimension.H ? this.containerPos.x : this.containerPos.y;
  }

  setContainerPosition(x: ContainerPosition, y: ContainerPosition): void {
    this.containerPos = { x, y };
  }

  getContents(): ReadonlyArray<DiagramElement> {
    return [];
  }

  addTemporaryContent(_t: Temporary): void {}

  getTraversalRule(_d: Direction): BorderTraversal {
    return BorderTraversal.LEAVING;
  }

  getLayout(): Layout | null {
    return null;
  }

  getGridColumns(): number {
    return 0;
  }

  getGridRows(): number {
    return 0;
  }

  deepContains(d: DiagramElement): boolean {
    return d === this;
  }

  getConnectionsSeparationApproach(): ConnectionsSeparation {
    return ConnectionsSeparation.SEPARATE;
  }

  getLinkGutter(): number {
    return 0;
  }

  getLinkInset(): number {
    return 0;
  }

  getMargin(_d: Direction): number {
    return 0;
  }

  getPadding(_d: Direction): number {
    return 0;
  }

  getMinimumSize() {
    return new BasicDimension2DImpl(0, 0);
  }

  getSizing(_horiz: boolean): DiagramElementSizing {
    return DiagramElementSizing.MINIMIZE;
  }
}

/** Factory used by RHD / grid when the diagram model already exists. */
export class LayoutDiagramElementFactory
  implements DiagramElementFactory<unknown>
{
  setElementContext(_ec: ElementContext): void {}

  createDiagramElement(
    _x: unknown,
    _parent: DiagramElement | null,
  ): DiagramElement | null {
    return null;
  }

  createTemporaryConnected(
    parent: ConnectedRectangular,
    idSuffix: string,
  ): TemporaryConnectedRectangular {
    return new LayoutTemporaryConnected(
      `${parent.getID()}-tmp-${idSuffix}`,
      parent as Rectangular,
    );
  }
}
