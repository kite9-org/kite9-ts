import { Direction } from "@kite9/model";
import type { BiDirectional, Connected } from "@kite9/model";
import { isConnection } from "../../../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import { LogicException } from "../../../logging/LogicException.js";
import { Tools } from "../../Tools.js";
import type { AbstractCompoundGroup } from "../grouping/basic/group/AbstractCompoundGroup.js";
import { isCompoundGroup, type Group } from "../grouping/basic/group/Group.js";
import type { RoutableHandler2D } from "../position/RoutableHandler2D.js";
import type { ConnectionManager, MutableIterator } from "./ConnectionManager.js";

type BD = BiDirectional<Connected>;

/** Kotlin `ArrayList.iterator()`, supporting `remove()`. */
class ListIterator<T> implements MutableIterator<T> {
  private i = 0;

  constructor(private readonly list: T[]) {}

  hasNext(): boolean {
    return this.i < this.list.length;
  }

  next(): T {
    if (!this.hasNext()) throw new LogicException("No such element");
    return this.list[this.i++]!;
  }

  remove(): void {
    if (this.i === 0) throw new LogicException("next() not called");
    this.list.splice(--this.i, 1);
  }
}

export class RankBasedConnectionQueue implements ConnectionManager, Logable {
  private readonly alreadyAdded: Set<BD> = new Set<BD>();
  log: Kite9Log = kite9Log(this);
  private _hasContradictions = false;

  readonly x: BD[] = [];
  readonly y: BD[] = [];
  readonly u: BD[] = [];

  constructor(_rh: RoutableHandler2D) {}

  get prefix(): string {
    return "CQ  ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  getRankFor(arg0: BD): number {
    return isConnection(arg0) ? arg0.getRank() : 0;
  }

  readonly comp = (arg0: BD, arg1: BD): number => {
    const r0 = this.getRankFor(arg0);
    const r1 = this.getRankFor(arg1);
    return Math.sign(r1 - r0);
  };

  considerThis(c: BD, cg: AbstractCompoundGroup): boolean {
    if (this.alreadyAdded.has(c)) {
      return false;
    }
    if (this.considerThisB(c, cg)) {
      this.alreadyAdded.add(c);
      return true;
    }
    return false;
  }

  iterator(): MutableIterator<BD> {
    this.x.sort(this.comp);
    this.y.sort(this.comp);

    const xi = new ListIterator(this.x);
    const yi = new ListIterator(this.y);
    const ui = new ListIterator(this.u);
    let current = 0;

    return {
      hasNext: () => xi.hasNext() || yi.hasNext() || ui.hasNext(),
      next: () => {
        if (xi.hasNext()) {
          current = 0;
          return xi.next();
        } else if (yi.hasNext()) {
          current = 1;
          return yi.next();
        } else if (ui.hasNext()) {
          current = 2;
          return ui.next();
        } else {
          throw new LogicException("No such element");
        }
      },
      remove: () => {
        if (current === 0) {
          xi.remove();
        } else if (current === 1) {
          yi.remove();
        } else if (current === 2) {
          ui.remove();
        }
      },
    };
  }

  *[Symbol.iterator](): Iterator<BD> {
    const it = this.iterator();
    while (it.hasNext()) {
      yield it.next();
    }
  }

  handleLinks(g: Group): void {
    if (isCompoundGroup(g)) {
      const cg = g as AbstractCompoundGroup;
      const internalLinkA = cg.internalLinkA;
      if (internalLinkA != null) {
        for (const c of internalLinkA.connections) {
          if (this.considerThis(c, cg)) {
            this.add(c);
          }
        }
      }
    } else {
      // self-links aren't allowed yet
      const internalLinks = g.getLink(g);
      if (internalLinks != null) {
        for (const l of internalLinks.connections) {
          if (isConnection(l)) {
            l.getRenderingInformation().rendered = false;
          } else {
            throw new LogicException(`Not sure what this is: ${l}`);
          }
        }
      }
    }
  }

  considerThisB(c: BD, cg: AbstractCompoundGroup): boolean {
    if (isConnection(c)) {
      const d = c.getDrawDirection();
      return (
        (d == null && !this.u.includes(c)) ||
        ((d === Direction.LEFT || d === Direction.RIGHT) && cg.axis.isHorizontal) ||
        ((d === Direction.UP || d === Direction.DOWN) && cg.axis.isVertical)
      );
    }
    return false;
  }

  add(element: BD): boolean {
    const d = element.getDrawDirection();
    const contradiction = isConnection(element) && Tools.isConnectionContradicting(element);
    if (contradiction) {
      this._hasContradictions = true;
    }
    if (d == null || contradiction) {
      this.u.push(element);
      return true;
    }
    switch (d) {
      case Direction.UP:
      case Direction.DOWN:
        this.y.push(element);
        return true;
      case Direction.LEFT:
      case Direction.RIGHT:
        this.x.push(element);
        return true;
    }
  }

  addAll(elements: Iterable<BD>): boolean {
    for (const e of elements) {
      this.add(e);
    }
    return true;
  }

  clear(): void {
    this.u.length = 0;
    this.x.length = 0;
    this.y.length = 0;
  }

  isEmpty(): boolean {
    return this.x.length === 0 && this.y.length === 0 && this.u.length === 0;
  }

  remove(element: BD): boolean {
    return removeFrom(this.x, element) || removeFrom(this.y, element) || removeFrom(this.u, element);
  }

  contains(element: BD): boolean {
    return (
      this.alreadyAdded.has(element) ||
      this.u.includes(element) ||
      this.x.includes(element) ||
      this.y.includes(element)
    );
  }

  containsAll(_elements: Iterable<BD>): boolean {
    throw new Error("Unsupported operation");
  }

  retainAll(_elements: Iterable<BD>): boolean {
    throw new Error("Unsupported operation");
  }

  removeAll(_elements: Iterable<BD>): boolean {
    throw new Error("Unsupported operation");
  }

  get size(): number {
    return this.x.length + this.y.length + this.u.length;
  }

  hasContradictions(): boolean {
    return this._hasContradictions;
  }

  toString(): string {
    return `[${this.x.join(", ")}]/[${this.y.join(", ")}]/[${this.u.join(", ")}]`;
  }
}

function removeFrom<T>(list: T[], element: T): boolean {
  const i = list.indexOf(element);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}
