import { valueEquals, valueHashCode } from "../../equality.js";
import type { AbstractSSP } from "./AbstractSSP.js";
import type { PathLocation } from "./PathLocation.js";
import { PriorityQueue } from "./PriorityQueue.js";
import { SSPTooLargeException } from "./SSPTooLargeException.js";

/**
 * Kotlin `HashMap<Any?, P>`: keys are compared with `equals` / `hashCode`, so locations that are
 * value objects (e.g. route points) de-duplicate correctly.
 */
class LocationMap<P> {
  private readonly buckets = new Map<number, { key: unknown; value: P }[]>();
  private count = 0;

  get size(): number {
    return this.count;
  }

  get(key: unknown): P | undefined {
    const bucket = this.buckets.get(valueHashCode(key));
    return bucket?.find((e) => valueEquals(e.key, key))?.value;
  }

  set(key: unknown, value: P): void {
    const h = valueHashCode(key);
    let bucket = this.buckets.get(h);
    if (bucket == null) {
      bucket = [];
      this.buckets.set(h, bucket);
    }
    const existing = bucket.find((e) => valueEquals(e.key, key));
    if (existing) {
      existing.value = value;
    } else {
      bucket.push({ key, value });
      this.count++;
    }
  }
}

export class State<P extends PathLocation<P>> {
  pq: PriorityQueue<P> = new PriorityQueue<P>(10000);
  private readonly locationToPathMap = new LocationMap<P>();
  private adds = 0;
  private maxStack = 0;

  constructor(private readonly ssp: AbstractSSP<P>) {}

  add(path: P): boolean {
    try {
      this.adds++;
      const location = this.ssp.getLocation(path);
      const existing = this.locationToPathMap.get(location);
      const newBetter = existing == null || existing.compareTo(path) > 0;
      if (newBetter) {
        existing?.setActive(false);
        this.pq.add(path);
        this.locationToPathMap.set(location, path);
        this.maxStack = Math.max(this.pq.size(), this.maxStack);
        return true;
      } else {
        return false;
      }
    } catch {
      throw new SSPTooLargeException(
        `SSP too large: queue=${this.pq.size()} map=${this.locationToPathMap.size}`,
      );
    }
  }

  remove(): P {
    const next = this.pq.remove();
    if (next == null) {
      throw new Error("PriorityQueue empty");
    }
    return next;
  }

  getAdds(): number {
    return this.adds;
  }

  getMaxStack(): number {
    return this.maxStack;
  }
}
