import { describe, expect, it } from "vitest";
import {
  NullKite9Log,
  PriorityQueue,
  BasicBounds,
  Slideable,
  type SlackOptimisationHost,
} from "../../src/index.js";

class Host implements SlackOptimisationHost {
  log = new NullKite9Log();
  pushCount = 0;
  constructor(private size = 10) {}
  getSize(): number {
    return this.size;
  }
}

class S extends Slideable {
  constructor(so: SlackOptimisationHost, readonly name: string) {
    super(so);
  }
  toString(): string {
    return this.name;
  }
}

describe("Slideable / SingleDirection", () => {
  it("pushes minimum positions along forward constraints", () => {
    const so = new Host();
    const a = new S(so, "a");
    const b = new S(so, "b");
    const c = new S(so, "c");
    a.addMinimumForwardConstraint(b, 10);
    b.addMinimumForwardConstraint(c, 5);
    expect(c.minimumPosition).toBe(15);
    a.minimumPosition = 20;
    expect(b.minimumPosition).toBe(30);
    expect(c.minimumPosition).toBe(35);
    expect(so.pushCount).toBeGreaterThan(0);
  });

  it("detects cycles in canAddMinimumForwardConstraint", () => {
    const so = new Host();
    const a = new S(so, "a");
    const b = new S(so, "b");
    a.addMinimumForwardConstraint(b, 10);
    expect(a.canAddMinimumForwardConstraint(b, 20)).toBe(true);
    expect(b.canAddMinimumForwardConstraint(a, 5)).toBe(false);
  });

  it("computes minimum distance and tracks maximums", () => {
    const so = new Host();
    const a = new S(so, "a");
    const b = new S(so, "b");
    a.addMinimumForwardConstraint(b, 10);
    a.addMaximumForwardConstraint(b, 10); // maximum direction is decreasing
    expect(a.getMinimumForwardConstraintTo(b)).toBe(10);
    expect(a.minimumDistanceTo(b)).toBeGreaterThanOrEqual(0);
    expect([...a.getForwardSlideables(true)]).toEqual([b]);
  });
});

describe("PriorityQueue", () => {
  it("orders with comparator and growth", () => {
    const pq = new PriorityQueue<number>(1, (x, y) => x - y);
    [5, 3, 9, 1, 7, 2, 8, 0, 4, 6].forEach((n) => pq.add(n));
    const out: number[] = [];
    while (pq.size() > 0) out.push(pq.remove()!);
    expect(out).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pq.peek()).toBeNull();
  });

  it("orders Comparables without comparator", () => {
    const mk = (v: number) => ({ v, compareTo: (o: { v: number }) => v - o.v });
    const pq = new PriorityQueue<ReturnType<typeof mk>>(4);
    [3, 1, 2].forEach((n) => pq.add(mk(n)));
    expect(pq.remove()!.v).toBe(1);
    expect(pq.remove()!.v).toBe(2);
  });
});

describe("BasicBounds", () => {
  it("narrow / expand / compare", () => {
    const a = new BasicBounds(0.1, 0.5);
    const b = new BasicBounds(0.4, 0.9);
    expect(a.expand(b)).toEqual(new BasicBounds(0.1, 0.9));
    expect(a.narrow(b)).toEqual(new BasicBounds(0.4, 0.5));
    expect(a.narrow(new BasicBounds(0.6, 0.7))).toBe(BasicBounds.EMPTY_BOUNDS);
    expect(a.compareTo(new BasicBounds(0.6, 0.7))).toBe(-1);
    expect(() => new BasicBounds(0.5, 0.1)).toThrow();
  });
});
