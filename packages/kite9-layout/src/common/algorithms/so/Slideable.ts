import { LogicException } from "../../../logging/LogicException.js";
import type { Kite9Log } from "../../../logging/Kite9Log.js";
import type { PositionChangeNotifiable } from "./PositionChangeNotifiable.js";
import { SingleDirection } from "./SingleDirection.js";
import { SlideableException } from "./SlideableException.js";

/**
 * What a Slideable needs from its owning slack-optimisation (Kotlin: C2SlackOptimisation).
 * The compaction package's slack optimisation implements this.
 */
export interface SlackOptimisationHost {
  readonly log: Kite9Log;
  pushCount: number;
  /** Number of slideables; used as the max recursion depth for constraint updates. */
  getSize(): number;
}

export abstract class Slideable implements PositionChangeNotifiable {
  protected readonly minimum: SingleDirection;
  protected readonly maximum: SingleDirection;

  private hasBackwardConstraints = false;

  constructor(readonly so: SlackOptimisationHost) {
    this.minimum = new SingleDirection(this, true);
    this.maximum = new SingleDirection(this, false);
  }

  get minimumPosition(): number {
    return this.minimum.position;
  }

  set minimumPosition(i: number) {
    this.minimum.increasePosition(i, this.so.getSize());
  }

  get maximumPosition(): number {
    return this.maximum.position;
  }

  set maximumPosition(i: number) {
    this.maximum.increasePosition(i, this.so.getSize());
  }

  getMinimumForwardConstraintTo(d: Slideable): number | null {
    return this.minimum.forward.get(d.minimum) ?? null;
  }

  /**
   * Works out how much closer the current slideable can get to s. This works by fixing the
   * position for s (temporarily, using the cache) and then taking the max position for *this*.
   *
   * We can't move the element any further than the max position without breaking other
   * constraints.
   */
  minimumDistanceTo(s: Slideable): number {
    try {
      let maxSet: number | null = this.maximumPosition;
      maxSet = maxSet ?? 20000;
      const slack1 = this.minimum.minimumDistanceTo(
        s.minimum,
        maxSet,
        this.so.getSize(),
      );
      this.so.log.send(
        `Calculating minimum distance from ${this} to ${s} ${slack1}`,
      );
      const slack2 = s.maximum.minimumDistanceTo(
        this.maximum,
        s.minimumPosition,
        this.so.getSize(),
      );
      this.so.log.send(
        `Calculating minimum distance from ${s} to ${this} ${slack2}`,
      );
      if (slack2 == null) {
        return slack1 ?? 0;
      } else if (slack1 == null) {
        return slack2;
      } else {
        return Math.max(slack1, slack2);
      }
    } catch (e) {
      if (e instanceof TypeError) {
        // Kotlin: NullPointerException
        throw new LogicException("Some maximum size not set");
      }
      throw e;
    }
  }

  changedPosition(_newPos: number): void {
    this.so.pushCount++;
    const min = this.minimumPosition;
    const max = this.maximumPosition;
    if (max != null && min > max) {
      throw new LogicException(`Min ${min} > Max ${max}: ${this}`);
    }
  }

  canAddMinimumForwardConstraint(to: Slideable, dist: number): boolean {
    return this.minimum.canAddForwardConstraint(
      to.minimum,
      dist,
      this.so.getSize(),
    );
  }

  addMinimumForwardConstraint(to: Slideable, dist: number): void {
    try {
      this.minimum.addForwardConstraint(to.minimum, dist, this.so.getSize());
    } catch (e) {
      throw new SlideableException(
        `addMinimumForwardConstraint: ${this} to ${to} dist: ${dist}`,
        e,
      );
    }
  }

  addMinimumBackwardConstraint(to: Slideable, dist: number): void {
    try {
      this.minimum.addBackwardConstraint(to.minimum, dist, this.so.getSize());
      this.hasBackwardConstraints = true;
    } catch (e) {
      throw new SlideableException(
        `addMinimumBackwardConstraint: ${this} to ${to} dist: ${dist}`,
        e,
      );
    }
  }

  replaceConstraint(was: Slideable, now: Slideable): void {
    this.minimum.replaceForwardConstraint(was.minimum, now.minimum);
    this.minimum.replaceBackwardConstraint(was.minimum, now.minimum);
    this.maximum.replaceForwardConstraint(was.maximum, now.maximum);
    this.maximum.replaceBackwardConstraint(was.maximum, now.maximum);
  }

  addMaximumForwardConstraint(to: Slideable, dist: number): void {
    try {
      this.maximum.addForwardConstraint(to.maximum, dist, this.so.getSize());
    } catch (e) {
      throw new SlideableException(
        `addMaximumForwardConstraint: ${this} to ${to} dist: ${dist}`,
        e,
      );
    }
  }

  addMaximumBackwardConstraint(to: Slideable, dist: number): void {
    try {
      this.maximum.addBackwardConstraint(to.maximum, dist, this.so.getSize());
      this.hasBackwardConstraints = true;
    } catch (e) {
      throw new SlideableException(
        `addMaximumBackwardConstraint: ${this} to ${to} dist: ${dist}`,
        e,
      );
    }
  }

  /** Kotlin returns Set<C2Slideable>; callers can narrow via the type parameter. */
  getForwardSlideables<T extends Slideable = Slideable>(
    increasing: boolean,
  ): Set<T> {
    const out = new Set<T>();
    const sds = increasing ? this.minimum.forward : this.maximum.forward;
    for (const sd of sds.keys()) {
      out.add(sd.owner as unknown as T);
    }
    return out;
  }

  outputConstraints(): void {
    console.log(`maximum: \n${this.maximum}\nminimum: ${this.minimum}`);
  }

  /** Kept for parity with Kotlin's private `hasBackwardConstraints` flag. */
  protected get hasBackward(): boolean {
    return this.hasBackwardConstraints;
  }
}
