import type {
  Dimension2D,
  LongFraction,
  OPair,
  RectangleRenderingInformation,
  RouteRenderingInformation,
} from "@kite9/model";

class StubDimension2D implements Dimension2D {
  constructor(
    readonly w: number,
    readonly h: number,
  ) {}
  size(): Dimension2D {
    return this;
  }
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
    return new StubDimension2D(this.w + by.w, this.h + by.h);
  }
  minus(by: Dimension2D): Dimension2D {
    return new StubDimension2D(this.w - by.w, this.h - by.h);
  }
  setY(y: number): Dimension2D {
    return new StubDimension2D(this.w, y);
  }
  setX(x: number): Dimension2D {
    return new StubDimension2D(x, this.h);
  }
}

export function createRectangleRI(): RectangleRenderingInformation {
  let gridX = 0;
  let gridY = 0;
  let gx: OPair<LongFraction> | null = null;
  let gy: OPair<LongFraction> | null = null;
  return {
    rendered: false,
    size: null,
    position: null,
    cellXPositions: null,
    cellYPositions: null,
    gridXSize: () => gridX,
    gridYSize: () => gridY,
    gridXPosition: () => gx,
    gridYPosition: () => gy,
    setGridXPosition(v) {
      gx = v;
    },
    setGridYPosition(v) {
      gy = v;
    },
    setGridXSize(x) {
      gridX = x;
    },
    setGridYSize(y) {
      gridY = y;
    },
  };
}

export function createRouteRI(): RouteRenderingInformation {
  const positions: Dimension2D[] = [];
  const hops: boolean[] = [];
  return {
    rendered: false,
    size: null,
    position: null,
    routePositions: positions,
    hops,
    getWaypoint(pos: number) {
      return positions[pos] ?? null;
    },
    clear() {
      positions.length = 0;
      hops.length = 0;
    },
    getLength() {
      return positions.length;
    },
    add(d: Dimension2D) {
      positions.push(d);
      hops.push(false);
    },
    isHop(pos: number) {
      return hops[pos] ?? false;
    },
    isContradicting: false,
  };
}

export { StubDimension2D };
