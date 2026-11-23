export enum Turn {
  STRAIGHT = "STRAIGHT",
  LEFT = "LEFT",
  BACK = "BACK",
  RIGHT = "RIGHT",
}

/** STRAIGHT=0, LEFT=-1, BACK=0, RIGHT=1 */
export function turnValue(value: Turn): number {
  switch (value) {
    case Turn.LEFT:
      return -1;
    case Turn.RIGHT:
      return 1;
    case Turn.STRAIGHT:
    case Turn.BACK:
      return 0;
  }
}
