import type { CompactionSlideable } from "../CompactionSlideable.js";
import { Side } from "../Side.js";
import { SlackOptimisation } from "../SlackOptimisation.js";
import type { RoutableSlideableSet } from "./RoutableSlideableSet.js";

export class RoutableSlideableSetImpl implements RoutableSlideableSet {
  readonly kind = "routable" as const;

  readonly bs: ReadonlySet<CompactionSlideable>;
  private readonly a: ReadonlySet<CompactionSlideable>;

  done = false;

  constructor(
    readonly c: CompactionSlideable | null,
    readonly bl: CompactionSlideable | null,
    readonly br: CompactionSlideable | null,
    readonly previous: RoutableSlideableSet | null = null,
    readonly number: number = SlackOptimisation.nextNumber(),
  ) {
    this.bs = setOfNotNull(bl, br);
    this.a = setOfNotNull(c, bl, br);
  }

  getAll(): ReadonlySet<CompactionSlideable> {
    return this.a;
  }

  replace(s: CompactionSlideable, withS: CompactionSlideable): RoutableSlideableSetImpl {
    this.done = true;
    return new RoutableSlideableSetImpl(
      this.c === s ? withS : this.c,
      this.bl === s ? withS : this.bl,
      this.br === s ? withS : this.br,
      this,
    );
  }

  toString(): string {
    return `RoutableSlideableSetImpl(number=${this.number}\t c=${String(this.c)},\n\t bs=[${[...this.bs].join(", ")}],\n\t done=${this.done},\n)`;
  }

  replaceSide(s: CompactionSlideable | null, side: Side): RoutableSlideableSet {
    if (side === Side.START) {
      if (s !== this.bl) {
        this.done = true;
        return new RoutableSlideableSetImpl(this.c, s, this.br, this);
      } else {
        return this;
      }
    } else {
      if (s !== this.br) {
        this.done = true;
        return new RoutableSlideableSetImpl(this.c, this.bl, s, this);
      } else {
        return this;
      }
    }
  }
}

function setOfNotNull<T>(...items: (T | null)[]): ReadonlySet<T> {
  return new Set(items.filter((x): x is T => x != null));
}
