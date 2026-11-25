/**
 * Helpers emulating Kotlin collection semantics the compaction relies on:
 * value-equality for sets-of-sets, and maps keyed by data-class tuples (Pair / Triple).
 */

export function setEquals<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

export function union<T>(...sets: Iterable<T>[]): Set<T> {
  const out = new Set<T>();
  for (const s of sets) {
    for (const x of s) out.add(x);
  }
  return out;
}

/** Kotlin `MutableSet<Set<T>>.add`: no-op if a set with the same contents is already present. */
export function addToSuperSet<T>(ss: Set<ReadonlySet<T>>, s: ReadonlySet<T>): void {
  for (const existing of ss) {
    if (setEquals(existing, s)) return;
  }
  ss.add(s);
}

/** Kotlin `==` on two `Set<Set<T>>`. */
export function superSetEquals<T>(
  a: ReadonlySet<ReadonlySet<T>>,
  b: ReadonlySet<ReadonlySet<T>>,
): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) {
    let found = false;
    for (const y of b) {
      if (setEquals(x, y)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

const objectIds = new WeakMap<object, number>();
let nextObjectId = 0;

/** Stable per-object identity number, for building composite keys over object references. */
export function objectId(o: object): number {
  let id = objectIds.get(o);
  if (id === undefined) {
    id = nextObjectId++;
    objectIds.set(o, id);
  }
  return id;
}

/**
 * Map keyed by a composite value (Kotlin data-class keys such as `Pair` / `Triple`).
 * The key function must produce equal strings for equal keys.
 */
export class KeyedMap<K, V> {
  private readonly m = new Map<string, { key: K; value: V }>();

  constructor(private readonly keyFn: (k: K) => string) {}

  get size(): number {
    return this.m.size;
  }

  get(k: K): V | undefined {
    return this.m.get(this.keyFn(k))?.value;
  }

  has(k: K): boolean {
    return this.m.has(this.keyFn(k));
  }

  set(k: K, v: V): this {
    const id = this.keyFn(k);
    const existing = this.m.get(id);
    if (existing) {
      existing.value = v;
    } else {
      this.m.set(id, { key: k, value: v });
    }
    return this;
  }

  delete(k: K): boolean {
    return this.m.delete(this.keyFn(k));
  }

  getOrPut(k: K, f: () => V): V {
    const existing = this.m.get(this.keyFn(k));
    if (existing) return existing.value;
    const v = f();
    this.set(k, v);
    return v;
  }

  *keys(): IterableIterator<K> {
    for (const e of this.m.values()) yield e.key;
  }

  *values(): IterableIterator<V> {
    for (const e of this.m.values()) yield e.value;
  }

  *entries(): IterableIterator<[K, V]> {
    for (const e of this.m.values()) yield [e.key, e.value];
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}
