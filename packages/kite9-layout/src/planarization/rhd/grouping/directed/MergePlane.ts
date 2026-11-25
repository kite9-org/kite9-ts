/**
 * This enum makes sure that compound groups can only join correctly
 * with other compound groups. e.g. X or Y axis merging with their same
 * type.  "Unknown" means that there is no ongoing type of merge so you
 * can combine with any other group.
 */
export enum MergePlane {
  X_FIRST_MERGE = "X_FIRST_MERGE",
  Y_FIRST_MERGE = "Y_FIRST_MERGE",
  UNKNOWN = "UNKNOWN",
}

/** Kotlin `MergePlane.matches(state)`. */
export function mergePlaneMatches(self: MergePlane, state: MergePlane): boolean {
  if (self === MergePlane.X_FIRST_MERGE) {
    if (state === MergePlane.Y_FIRST_MERGE) {
      return false;
    }
  } else if (self === MergePlane.Y_FIRST_MERGE) {
    if (state === MergePlane.X_FIRST_MERGE) {
      return false;
    }
  }
  return true;
}
