import type { Comparable } from "@kite9/model";
import { SSPTooLargeException } from "./SSPTooLargeException.js";

const MAX_ARRAY_SIZE = 2147483647 - 8;

/**
 * Taken from the Java standard library (via the Kotlin port) and turned into TypeScript.
 * Binary min-heap. Without a comparator, elements must implement `compareTo`.
 *
 * Note: unlike the Kotlin port, removed slots are cleared, so `peek()` on an empty queue
 * returns null rather than a stale element.
 *
 * @author Josh Bloch, Doug Lea
 */
export class PriorityQueue<E> {
  private queue: (unknown | null)[];
  private modCount = 0;
  private _size = 0;

  constructor(
    initialCapacity: number,
    readonly comparator: ((a: E, b: E) => number) | null = null,
  ) {
    this.queue = new Array<unknown | null>(initialCapacity).fill(null);
  }

  size(): number {
    return this._size;
  }

  peek(): E | null {
    if (this._size === 0) return null;
    return (this.queue[0] ?? null) as E | null;
  }

  /** Increases the capacity of the array. */
  private grow(minCapacity: number): void {
    const oldCapacity = this.queue.length;
    // Double size if small; else grow by 50%
    let newCapacity =
      oldCapacity + (oldCapacity < 64 ? oldCapacity + 2 : oldCapacity >> 1);
    // overflow-conscious code
    if (newCapacity - MAX_ARRAY_SIZE > 0) newCapacity = this.hugeCapacity(minCapacity);
    const next = new Array<unknown | null>(newCapacity).fill(null);
    for (let i = 0; i < this.queue.length; i++) next[i] = this.queue[i];
    this.queue = next;
  }

  add(e: E): boolean {
    this.modCount++;
    const i = this._size;
    if (i >= this.queue.length) this.grow(i + 1);
    this.siftUp(i, e);
    this._size = i + 1;
    return true;
  }

  remove(): E | null {
    const es = this.queue;
    if (this._size === 0) {
      return null;
    }

    const result = es[0] as E;
    this.modCount++;
    const n = --this._size;
    const x = es[n];
    es[n] = null;
    if (n > 0) {
      if (this.comparator == null) this.siftDownComparable(0, x, es, n);
      else this.siftDownUsingComparator(0, x as E, es, n, this.comparator);
    }

    return result;
  }

  private siftDownComparable(
    k: number,
    x: unknown,
    es: (unknown | null)[],
    n: number,
  ): void {
    const key = x as Comparable<unknown>;
    const half = n >>> 1; // loop while a non-leaf
    while (k < half) {
      let child = (k << 1) + 1; // assume left child is least
      let c = es[child];
      const right = child + 1;
      if (right < n && (c as Comparable<unknown>).compareTo(es[right]) > 0) {
        child = right;
        c = es[child];
      }
      if (key.compareTo(c) <= 0) break;
      es[k] = c;
      k = child;
    }
    es[k] = key;
  }

  private siftDownUsingComparator(
    k: number,
    x: E,
    es: (unknown | null)[],
    n: number,
    cmp: (a: E, b: E) => number,
  ): void {
    const half = n >>> 1;
    while (k < half) {
      let child = (k << 1) + 1;
      let c = es[child];
      const right = child + 1;
      if (right < n && cmp(c as E, es[right] as E) > 0) {
        child = right;
        c = es[child];
      }
      if (cmp(x, c as E) <= 0) break;
      es[k] = c;
      k = child;
    }
    es[k] = x;
  }

  private siftUp(k: number, x: E): void {
    if (this.comparator != null) this.siftUpUsingComparator(k, x, this.queue, this.comparator);
    else this.siftUpComparable(k, x, this.queue);
  }

  private siftUpComparable(k: number, x: E, es: (unknown | null)[]): void {
    const key = x as unknown as Comparable<unknown>;
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const e = es[parent];
      if (key.compareTo(e) >= 0) break;
      es[k] = e;
      k = parent;
    }
    es[k] = key;
  }

  private siftUpUsingComparator(
    k: number,
    x: E,
    es: (unknown | null)[],
    cmp: (a: E, b: E) => number,
  ): void {
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const e = es[parent];
      if (cmp(x, e as E) >= 0) break;
      es[k] = e;
      k = parent;
    }
    es[k] = x;
  }

  private hugeCapacity(minCapacity: number): number {
    if (minCapacity < 0) throw new SSPTooLargeException("can't continue");
    return minCapacity > MAX_ARRAY_SIZE ? 2147483647 : MAX_ARRAY_SIZE;
  }
}
