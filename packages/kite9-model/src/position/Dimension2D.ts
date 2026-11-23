export interface Dimension2D {
  readonly w: number;
  readonly h: number;
  size(): Dimension2D;
  x(): number;
  y(): number;
  width(): number;
  height(): number;
  add(by: Dimension2D): Dimension2D;
  minus(by: Dimension2D): Dimension2D;
  setY(y: number): Dimension2D;
  setX(x: number): Dimension2D;
}

export interface BasicDimension2D extends Dimension2D {}

export interface CostedDimension2D extends Dimension2D {
  readonly cost: number;
  compareTo(other: CostedDimension2D): number;
}

export interface Rectangle2D {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly maxX: number;
  readonly maxY: number;
}
