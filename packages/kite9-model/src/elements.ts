import type { Comparable, Deterministic, Dimension } from "./common.js";
import type { Direction } from "./position/Direction.js";
import type { Layout } from "./position/Layout.js";
import type { Dimension2D } from "./position/Dimension2D.js";
import type {
  RectangleRenderingInformation,
  RenderingInformation,
  RouteRenderingInformation,
} from "./position/RenderingInformation.js";
import type {
  BorderTraversal,
  ConnectionsSeparation,
  DiagramElementSizing,
  DiagramElementType,
  End,
  HorizontalAlignment,
  VerticalAlignment,
} from "@kite9/css";
import type { ContainerPosition, Placement } from "./position/ContainerPosition.js";

export interface DiagramElement
  extends Comparable<DiagramElement>, Deterministic {
  getType(): DiagramElementType;
  getParent(): DiagramElement | null;
  getRenderingInformation(): RenderingInformation;
  getDepth(): number;
  getContainer(): Rectangular | null;
}

export interface Positioned extends DiagramElement {
  getRenderingInformation(): RectangleRenderingInformation;
  getContainerPosition(d: Dimension): ContainerPosition | null;
}

export interface PlacementPositioned
  extends Omit<Positioned, "getContainerPosition"> {
  getContainerPosition(d: Dimension): Placement;
}

export interface Temporary extends DiagramElement {}

export interface Rectangular extends Positioned {
  getContents(): ReadonlyArray<DiagramElement>;
  addTemporaryContent(t: Temporary): void;
  getTraversalRule(d: Direction): BorderTraversal;
  getLayout(): Layout | null;
  getGridColumns(): number;
  getGridRows(): number;
  deepContains(d: DiagramElement): boolean;
}

export interface SizedRectangular extends Rectangular {
  getMargin(d: Direction): number;
  getPadding(d: Direction): number;
  getMinimumSize(): Dimension2D;
  getSizing(horiz: boolean): DiagramElementSizing;
}

export interface AlignedRectangular extends Rectangular {
  getVerticalAlignment(): VerticalAlignment;
  getHorizontalAlignment(): HorizontalAlignment;
  getConnectionAlignment(d: Dimension): Placement;
}

export interface Connected extends Positioned {
  getLinks(): ReadonlyArray<Connection>;
  isConnectedDirectlyTo(c: Connected): boolean;
  getConnectionsSeparationApproach(): ConnectionsSeparation;
}

export interface ConnectedRectangular extends Rectangular, Connected {
  getType(): DiagramElementType.CONNECTED_RECTANGULAR;
  getLinkGutter(): number;
  getLinkInset(): number;
}

export interface Diagram extends Rectangular {
  getType(): DiagramElementType.DIAGRAM;
  getConnectionsFor(c: Connected): ReadonlyArray<Connection>;
}

/** Directed edge between two endpoints (from/to + optional draw direction). */
export interface BiDirectional<X> extends Deterministic {
  getFrom(): X;
  getTo(): X;
  otherEnd(end: X): X;
  meets(e: BiDirectional<X> | X | null): boolean;
  getDrawDirection(): Direction | null;
  getDrawDirectionFrom(from: X): Direction | null;
}

export interface Connection
  extends DiagramElement, BiDirectional<Connected> {
  getType(): DiagramElementType.CONNECTION;
  getFromDecoration(): Terminator;
  getToDecoration(): Terminator;
  getDecorationForEnd(end: DiagramElement): Terminator;
  getFromLabel(): Label | null;
  getToLabel(): Label | null;
  getRenderingInformation(): RouteRenderingInformation;
  getRank(): number;
  getMargin(d: Direction): number;
  getPadding(d: Direction): number;
  getMinimumLength(): number;
  getCornerRadius(): number;
  getFromArrivalSide(): Direction | null;
  getToArrivalSide(): Direction | null;
}

/** Connection endpoint label (from/to). Rendered as SVG `foreignObject`. */
export interface Label extends AlignedRectangular {
  getType(): DiagramElementType.LABEL;
  getEnd(): End;
  getLabelPlacement(): Direction | null;
}

export interface Port
  extends Omit<Connected, "getContainerPosition">, PlacementPositioned {
  getType(): DiagramElementType.PORT;
  getPortDirection(): Direction;
  getParent(): Rectangular;
}

export interface Terminator extends SizedRectangular {
  getType(): DiagramElementType.TERMINATOR;
  getReservedLength(): number;
  getMarkerReserve(): number;
  styleMatches(t2: Terminator | null): boolean;
  getArrivalSide(): Direction | null;
  getConnection(): Connection;
  getEnd(): End;
}

/** Marker for overlay content that consumes no layout space. */
export interface Decal {}
