import { LogicException } from "../../../logging/LogicException.js";
import type { PositionChangeNotifiable } from "./PositionChangeNotifiable.js";

/**
 * Marker used by `canAddForwardConstraint`: if the update visits `on` again, we've found a cycle
 * (the update would move us).
 */
export class QuitOnChange {
  on: SingleDirection | null = null;
}

/**
 * Handles the constraints for a Slideable in a single direction (e.g.
 * increasing or decreasing).
 *
 * This is a DAG, and we should be able to prove it.
 */
export class SingleDirection {
  private _position: number;

  forward: Map<SingleDirection, number> = new Map();
  backward: Map<SingleDirection, number> = new Map();

  private cachePosition: number | null = null;
  private cacheItem: object | null = null;

  constructor(
    readonly owner: PositionChangeNotifiable,
    private readonly increasing: boolean,
  ) {
    this._position = increasing ? 0 : 1000000;
  }

  get position(): number {
    return this._position;
  }

  private update(
    newPos: number,
    ci: object | null,
    changedConstraints: boolean,
    depth: number,
    maxDepth: number,
  ): boolean {
    if (depth > maxDepth && depth > 20) {
      throw new LogicException(`Depth exceeded.  Gave up on ${this}`);
    }
    try {
      if (
        this.cacheItem === ci &&
        ci instanceof QuitOnChange &&
        ci.on === this
      ) {
        // we've visited here before - return false if we move
        return this.increasing
          ? this.cachePosition! >= newPos
          : this.cachePosition! <= newPos;
      }
      if (this.cacheItem !== ci) {
        this.cacheItem = ci;
        this.cachePosition = this._position;
      }
      const moved =
        this.cachePosition == null ||
        (this.increasing
          ? this.cachePosition < newPos
          : this.cachePosition > newPos);
      let ok = true;
      if (moved || changedConstraints) {
        this.cachePosition = newPos;
        for (const [fwd, dist] of this.forward) {
          const newPositionFwd = this.increasing
            ? this.cachePosition + dist
            : this.cachePosition - dist;
          ok = ok && fwd.update(newPositionFwd, ci, false, depth + 1, maxDepth);
        }

        for (const [bck, dist] of this.backward) {
          const newPositionBck = this.increasing
            ? this.cachePosition - dist
            : this.cachePosition + dist;
          ok = ok && bck.update(newPositionBck, ci, false, depth + 1, maxDepth);
        }
        if (ci == null) {
          this._position = this.cachePosition;
          this.owner.changedPosition(this._position);
        }
      }
      return ok;
    } catch (e) {
      throw new LogicException(
        `Couldn't adjust (SO): ${this} pos: ${this._position} cachePos: ${this.cachePosition}`,
        e,
      );
    }
  }

  increasePosition(pos: number, maxDepth: number): void {
    this.update(pos, null, false, 0, maxDepth);
  }

  /**
   * Works out minimum distance to ci, given that our item is in a certain start position.
   * Returns null if the elements aren't connected.
   */
  minimumDistanceTo(
    ci: SingleDirection,
    startPosition: number,
    maxDepth: number,
  ): number | null {
    const cacheMarker = {};
    this.update(startPosition, cacheMarker, false, 0, maxDepth);
    if (ci.cacheItem !== cacheMarker) {
      // the two elements are independent, one doesn't push the other.
      return null;
    }
    return Math.abs(ci.cachePosition! - startPosition);
  }

  canAddForwardConstraint(
    to: SingleDirection,
    distance: number,
    maxDepth: number,
  ): boolean {
    const existing = this.forward.get(to);
    const qoc = new QuitOnChange();
    qoc.on = this;
    if (existing === undefined || existing < distance) {
      const curPos = this._position;
      this.update(curPos, qoc, false, 0, maxDepth);
      const newPos = this.increasing ? curPos + distance : curPos - distance;
      return to.update(newPos, qoc, true, 0, maxDepth);
    }
    return true;
  }

  addForwardConstraint(
    to: SingleDirection,
    distance: number,
    maxDepth: number,
  ): void {
    const existing = this.forward.get(to);
    if (existing === undefined || existing < distance) {
      this.forward.set(to, distance);
      this.update(this._position, null, true, 0, maxDepth);
    }
  }

  addBackwardConstraint(
    to: SingleDirection,
    distance: number,
    maxDepth: number,
  ): void {
    const existing = this.backward.get(to);
    if (existing === undefined || existing > distance) {
      this.backward.set(to, distance);
      this.update(this._position, null, true, 0, maxDepth);
    }
  }

  replaceForwardConstraint(was: SingleDirection, now: SingleDirection): void {
    const existing = this.forward.get(was);
    this.forward.delete(was);
    if (existing !== undefined) {
      this.forward.set(now, existing);
    }
  }

  replaceBackwardConstraint(was: SingleDirection, now: SingleDirection): void {
    const existing = this.backward.get(was);
    this.backward.delete(was);
    if (existing !== undefined) {
      this.backward.set(now, existing);
    }
  }

  toString(): string {
    return `f: ${this.forward.size} b: ${this.backward.size} o: ${String(this.owner)}`;
  }

  merge(
    sd: SingleDirection,
    exclude: ReadonlySet<SingleDirection>,
    maxDepth: number,
  ): void {
    for (const [k, v] of [...sd.forward]) {
      if (!exclude.has(k)) this.addForwardConstraint(k, v, maxDepth);
    }
    for (const [k, v] of [...sd.backward]) {
      if (!exclude.has(k)) this.addBackwardConstraint(k, v, maxDepth);
    }
  }

  outputConstraints(): void {
    console.log(
      `  forward: ${mapToString(this.forward)} \n  backward: ${mapToString(this.backward)}`,
    );
  }

  get maxDepth(): number {
    let depth = 0;
    for (const fwd of this.forward.keys()) {
      depth = Math.max(depth, fwd.maxDepth + 1);
    }
    for (const back of this.backward.keys()) {
      depth = Math.max(depth, back.maxDepth + 1);
    }
    return depth;
  }
}

function mapToString(m: ReadonlyMap<unknown, unknown>): string {
  return `{${[...m].map(([k, v]) => `${String(k)}=${String(v)}`).join(", ")}}`;
}
