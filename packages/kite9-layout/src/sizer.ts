import {
  Direction,
  DiagramElementType,
  type Connected,
  type Connection,
  type ConnectedRectangular,
  type DiagramElement,
  type Rectangular,
  type SizedRectangular,
} from "@kite9/model";

/**
 * Handles spacing between diagram components.
 *
 * Returns the necessary distance between two diagram elements, possibly connected by an
 * optional `along`. If `concave` is false, then `a` and `b` are not facing each other and the
 * distance is entirely due to the `along` part.
 */
export interface ElementSizer {
  getMinimumDistanceBetween(
    a: DiagramElement,
    aSide: Direction,
    b: DiagramElement,
    bSide: Direction,
    direction: Direction,
    along: DiagramElement | null,
    concave: boolean,
  ): number;
}

export interface DomElementSizerOptions {
  /**
   * Resolves the DOM host of a diagram element. Defaults to reading the `el` (templating
   * adapters) or `host` property, which wrap the underlying `Element`.
   */
  getHost?: (de: DiagramElement) => Element | null;
  /** Minimum gap enforced around everything (Kotlin `buffer`); default 0. */
  buffer?: number;
}

function isHorizontal(d: Direction): boolean {
  return d === Direction.LEFT || d === Direction.RIGHT;
}

function reverse(d: Direction): Direction {
  switch (d) {
    case Direction.UP:
      return Direction.DOWN;
    case Direction.DOWN:
      return Direction.UP;
    case Direction.LEFT:
      return Direction.RIGHT;
    case Direction.RIGHT:
      return Direction.LEFT;
  }
}

function isSized(de: DiagramElement): de is SizedRectangular {
  const s = de as Partial<SizedRectangular>;
  return typeof s.getMargin === "function" && typeof s.getPadding === "function";
}

function isConnection(de: DiagramElement): de is Connection {
  return de.getType() === DiagramElementType.CONNECTION;
}

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function isConnectedRectangular(de: DiagramElement): de is ConnectedRectangular {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
}

/**
 * {@link ElementSizer} that measures elements through their DOM hosts
 * (`getBoundingClientRect`), and takes gaps from `margin` / `padding` when the element
 * provides them (`SizedRectangular`, `Connection`), otherwise 0.
 */
export class DomElementSizer implements ElementSizer {
  private readonly getHost: (de: DiagramElement) => Element | null;
  private readonly buffer: number;

  constructor(options: DomElementSizerOptions = {}) {
    this.getHost =
      options.getHost ??
      ((de) => {
        const e = de as { el?: unknown; host?: unknown };
        const h = e.el ?? e.host;
        return typeof (h as Element | undefined)?.getBoundingClientRect === "function"
          ? (h as Element)
          : null;
      });
    this.buffer = options.buffer ?? 0;
  }

  getMinimumDistanceBetween(
    a: DiagramElement,
    aSide: Direction,
    b: DiagramElement,
    bSide: Direction,
    direction: Direction,
    along: DiagramElement | null,
    concave: boolean,
  ): number {
    return Math.max(
      this.inner(a, aSide, b, bSide, direction, along, concave),
      this.buffer,
    );
  }

  /** Measured width/height of an element: DOM bounding rect, else minimum size, else 0. */
  measure(de: DiagramElement): { w: number; h: number } {
    const host = this.getHost(de);
    if (host) {
      const r = host.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        return { w: r.width, h: r.height };
      }
    }
    const ms = (de as Partial<SizedRectangular>).getMinimumSize?.();
    return { w: ms?.w ?? 0, h: ms?.h ?? 0 };
  }

  private margin(de: DiagramElement, d: Direction): number {
    return isSized(de) || isConnection(de)
      ? (de as SizedRectangular).getMargin(d)
      : 0;
  }

  private padding(de: DiagramElement, d: Direction): number {
    return isSized(de) || isConnection(de)
      ? (de as SizedRectangular).getPadding(d)
      : 0;
  }

  private inner(
    a: DiagramElement,
    aSide: Direction,
    b: DiagramElement,
    bSide: Direction,
    direction: Direction,
    along: DiagramElement | null,
    concave: boolean,
  ): number {
    if (a === b && isRectangular(a)) {
      const size = this.measure(a);
      return isHorizontal(aSide) ? size.w : size.h;
    }

    let length: number;
    if (isConnection(a) && isConnection(b)) {
      length = a === b ? 0 : concave ? this.calculateMargin(a, aSide, b, bSide) : 0;
    } else if (isRectangular(a) && isRectangular(b)) {
      if (b.getContainer() === a) {
        length = Math.max(this.padding(a, aSide), this.margin(b, bSide));
      } else if (a.getContainer() === b) {
        length = Math.max(this.padding(b, bSide), this.margin(a, aSide));
      } else if (concave && aSide !== bSide) {
        length = this.calculateMargin(a, aSide, b, bSide);
      } else {
        length = 0;
      }
    } else if (isRectangular(a) && isConnection(b)) {
      length = this.rectangularToConnection(a, aSide, b, bSide, direction);
    } else if (isConnection(a) && isRectangular(b)) {
      length = this.rectangularToConnection(b, bSide, a, aSide, reverse(direction));
    } else {
      length = 0;
    }
    return this.incorporateAlong(along, length, a, b);
  }

  private rectangularToConnection(
    a: Rectangular,
    aSide: Direction,
    b: Connection,
    bSide: Direction,
    direction: Direction,
  ): number {
    if (aSide === direction) {
      // outside a
      if (this.isEventualParent(b, a)) {
        return 0;
      }
      return Math.max(this.margin(a, aSide), this.margin(b, bSide));
    }
    if (isConnectedRectangular(a) && b.meets(a as Connected)) {
      return 0; // a connection arriving at a rectangular
    }
    // inside a: use padding
    return Math.max(this.padding(a, direction), this.margin(b, reverse(direction)));
  }

  /** `along`: a connection's minimum length, or a connected element's link inset. */
  private incorporateAlong(
    along: DiagramElement | null,
    length: number,
    a: DiagramElement,
    b: DiagramElement,
  ): number {
    if (along && isConnection(along)) {
      const touchesA = isConnectedRectangular(a) && along.meets(a as Connected);
      const touchesB = isConnectedRectangular(b) && along.meets(b as Connected);
      if (!touchesA && !touchesB) {
        return length; // link passes through
      }
      return Math.max(length, along.getMinimumLength());
    }
    if (along && isConnectedRectangular(along)) {
      return Math.max(length, along.getLinkInset());
    }
    return length;
  }

  private calculateMargin(
    a: DiagramElement,
    aSide: Direction,
    b: DiagramElement,
    bSide: Direction,
  ): number {
    return Math.max(this.margin(a, aSide), this.margin(b, bSide));
  }

  private isEventualParent(d: DiagramElement | null, parent: DiagramElement): boolean {
    for (let p = d?.getParent() ?? null; p; p = p.getParent()) {
      if (p === parent) return true;
    }
    return false;
  }
}
