import type { BasicDimension2D, CostedDimension2D, Dimension2D } from "@kite9/model";

abstract class AbstractDimension2D implements Dimension2D {
  constructor(
    readonly w: number,
    readonly h: number,
  ) {}

  abstract size(): Dimension2D;

  x(): number {
    return this.w;
  }

  y(): number {
    return this.h;
  }

  width(): number {
    return this.w;
  }

  height(): number {
    return this.h;
  }

  add(by: Dimension2D): Dimension2D {
    return new BasicDimension2DImpl(this.width() + by.width(), this.height() + by.height());
  }

  minus(by: Dimension2D): Dimension2D {
    return new BasicDimension2DImpl(this.width() - by.width(), this.height() - by.height());
  }

  setY(y: number): Dimension2D {
    return new BasicDimension2DImpl(this.width(), y);
  }

  setX(x: number): Dimension2D {
    return new BasicDimension2DImpl(x, this.height());
  }

  equals(other: unknown): boolean {
    return (
      other instanceof AbstractDimension2D &&
      other.constructor === this.constructor &&
      other.w === this.w &&
      other.h === this.h
    );
  }

  toString(): string {
    return `[${this.w},${this.h}]`;
  }
}

/** Kotlin `BasicDimension2D` data class (immutable). */
export class BasicDimension2DImpl extends AbstractDimension2D implements BasicDimension2D {
  size(): Dimension2D {
    return this;
  }
}

/** Kotlin `CostedDimension2D` data class: a dimension with an associated cost. */
export class CostedDimension2DImpl extends AbstractDimension2D implements CostedDimension2D {
  constructor(
    w: number,
    h: number,
    readonly cost: number = 0,
  ) {
    super(w, h);
  }

  compareTo(other: CostedDimension2D): number {
    return Math.sign(this.cost - other.cost);
  }

  size(): Dimension2D {
    return this;
  }

  override equals(other: unknown): boolean {
    return super.equals(other) && (other as CostedDimension2DImpl).cost === this.cost;
  }
}
