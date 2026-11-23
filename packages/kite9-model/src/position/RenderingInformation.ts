import type { LongFraction, OPair } from "../common.js";
import type { Dimension2D } from "./Dimension2D.js";

export interface RenderingInformation {
  rendered: boolean;
  size: Dimension2D | null;
  position: Dimension2D | null;
}

export interface RectangleRenderingInformation extends RenderingInformation {
  gridXSize(): number;
  gridYSize(): number;
  gridXPosition(): OPair<LongFraction> | null;
  gridYPosition(): OPair<LongFraction> | null;
  setGridXPosition(gx: OPair<LongFraction> | null): void;
  setGridYPosition(gy: OPair<LongFraction> | null): void;
  setGridXSize(x: number): void;
  setGridYSize(y: number): void;
  cellXPositions: number[] | null;
  cellYPositions: number[] | null;
}

export interface RouteRenderingInformation extends RenderingInformation {
  readonly routePositions: ReadonlyArray<Dimension2D> | null;
  readonly hops: ReadonlyArray<boolean> | null;
  getWaypoint(pos: number): Dimension2D | null;
  clear(): void;
  getLength(): number;
  add(d: Dimension2D): void;
  isHop(pos: number): boolean;
  isContradicting: boolean;
}
