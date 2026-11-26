/** Paint-time layout DTOs for SVG connection / terminator / label rendering. */

import type { End } from "@kite9/css";
import type { Point2D, Size } from "./layout.js";

/** Connection body geometry for SVG rendering (path already corner-rounded). */
export type ConnectionRenderLayout = {
  id: string;
  /** SVG path `d` (M/L/A). */
  d: string;
  /** From-end tip (terminator / marker). */
  fromPoint: Point2D;
  /** To-end tip (terminator / marker). */
  toPoint: Point2D;
  /** Decoration style at the from end (`ARROW` / `NONE`) — drives `marker-start`. */
  fromStyle: string;
  /** Decoration style at the to end — drives `marker-end`. */
  toStyle: string;
};

/** Terminator pose + decoration style at a link end (hit-box + marker def). */
export type TerminatorRenderLayout = {
  style: string;
  end: End;
  point: Point2D;
};

/** Connection label pose for SVG foreignObject (text comes from the label host/model). */
export type LabelRenderLayout = {
  id: string;
  end: End;
  point: Point2D;
  size: Size;
};
