import type {
  Dimension2D,
  LongFraction,
  OPair,
  RectangleRenderingInformation,
} from "@kite9/model";

export class RectangleRenderingInformationImpl implements RectangleRenderingInformation {
  rendered = true;
  size: Dimension2D | null = null;
  position: Dimension2D | null = null;
  cellXPositions: number[] | null = [];
  cellYPositions: number[] | null = [];

  private gx: OPair<LongFraction> | null = null;
  private gy: OPair<LongFraction> | null = null;
  private sx = 0;
  private sy = 0;

  constructor(pos?: Dimension2D | null, size?: Dimension2D | null, rendered?: boolean) {
    if (pos !== undefined) this.position = pos;
    if (size !== undefined) this.size = size;
    if (rendered !== undefined) this.rendered = rendered;
  }

  gridXPosition(): OPair<LongFraction> | null {
    return this.gx;
  }

  gridYPosition(): OPair<LongFraction> | null {
    return this.gy;
  }

  setGridXPosition(gx: OPair<LongFraction> | null): void {
    this.gx = gx;
  }

  setGridYPosition(gy: OPair<LongFraction> | null): void {
    this.gy = gy;
  }

  gridXSize(): number {
    return this.sx;
  }

  gridYSize(): number {
    return this.sy;
  }

  setGridXSize(x: number): void {
    this.sx = x;
  }

  setGridYSize(y: number): void {
    this.sy = y;
  }
}
