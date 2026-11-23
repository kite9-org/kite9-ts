import { Layout } from "@kite9/css";

export { Layout };

export function needsLayoutEdge(d: Layout | null): boolean {
  return (
    d === Layout.LEFT ||
    d === Layout.RIGHT ||
    d === Layout.UP ||
    d === Layout.DOWN
  );
}

export function reverseLayout(d: Layout | null): Layout | null {
  switch (d) {
    case Layout.LEFT:
      return Layout.RIGHT;
    case Layout.RIGHT:
      return Layout.LEFT;
    case Layout.UP:
      return Layout.DOWN;
    case Layout.DOWN:
      return Layout.UP;
    default:
      return d;
  }
}

export function rotateLayoutClockwise(d: Layout | null): Layout | null {
  switch (d) {
    case Layout.UP:
      return Layout.RIGHT;
    case Layout.RIGHT:
      return Layout.DOWN;
    case Layout.DOWN:
      return Layout.LEFT;
    case Layout.LEFT:
      return Layout.UP;
    case Layout.HORIZONTAL:
      return Layout.VERTICAL;
    case Layout.VERTICAL:
      return Layout.HORIZONTAL;
    default:
      return d;
  }
}

export function rotateLayoutAntiClockwise(d: Layout | null): Layout | null {
  switch (d) {
    case Layout.UP:
      return Layout.LEFT;
    case Layout.LEFT:
      return Layout.DOWN;
    case Layout.DOWN:
      return Layout.RIGHT;
    case Layout.RIGHT:
      return Layout.UP;
    case Layout.HORIZONTAL:
      return Layout.VERTICAL;
    case Layout.VERTICAL:
      return Layout.HORIZONTAL;
    default:
      return d;
  }
}

export function isHorizontalLayout(d: Layout | null): boolean {
  return (
    d === Layout.HORIZONTAL || d === Layout.LEFT || d === Layout.RIGHT
  );
}
