import type { BiDirectional, Connected } from "@kite9/model";
import type { Group } from "../grouping/basic/group/Group.js";

/** Kotlin `MutableIterator`: an iterator supporting removal of the last returned element. */
export interface MutableIterator<T> {
  hasNext(): boolean;
  next(): T;
  remove(): void;
}

/** Kotlin `MutableCollection<BiDirectional<Connected>>` plus link handling. */
export interface ConnectionManager extends Iterable<BiDirectional<Connected>> {
  readonly size: number;
  iterator(): MutableIterator<BiDirectional<Connected>>;
  add(element: BiDirectional<Connected>): boolean;
  addAll(elements: Iterable<BiDirectional<Connected>>): boolean;
  remove(element: BiDirectional<Connected>): boolean;
  contains(element: BiDirectional<Connected>): boolean;
  containsAll(elements: Iterable<BiDirectional<Connected>>): boolean;
  retainAll(elements: Iterable<BiDirectional<Connected>>): boolean;
  removeAll(elements: Iterable<BiDirectional<Connected>>): boolean;
  clear(): void;
  isEmpty(): boolean;

  handleLinks(g: Group): void;

  hasContradictions(): boolean;
}
