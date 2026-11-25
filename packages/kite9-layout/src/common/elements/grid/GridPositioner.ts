import type { DiagramElement, Rectangular } from "@kite9/model";
import type { Dimension } from "@kite9/model";
import type { Side } from "../../../compaction/Side.js";

/** Handles positioning of elements for `Layout.GRID`. */
export interface GridPositioner {
  /**
   * Works out the position of the elements within the grid for a given container.
   * Results are cached per container.
   */
  placeOnGrid(gridContainer: Rectangular): DiagramElement[][];

  getPlaceOnGrid(de: DiagramElement, d: Dimension, side: Side): number;

  getMaxPlace(container: Rectangular, d: Dimension): number;
}
