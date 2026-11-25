import type { ConnectedRectangular, ContainerPosition } from "@kite9/model";

/** A `ConnectedRectangular` created by layout (e.g. to fill empty grid cells); it is `Temporary`. */
export interface TemporaryConnectedRectangular extends ConnectedRectangular {
  setContainerPosition(x: ContainerPosition, y: ContainerPosition): void;
}
