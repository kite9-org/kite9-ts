/**
 * The placement approach positions the attr and then works out how much the placement 'costs'
 * in terms of the remaining connections.
 *
 * @author robmoffat
 */
export interface PlacementApproach {
  evaluate(): void;
  readonly score: number;
  choose(): void;

  /**
   * Means that the placement order is the same as the numerical ordering of the group ordinals
   */
  readonly natural: boolean;
}
