/** Like a pair, but contains four items. */
export class Rectangle<X> {
  constructor(
    readonly a: X,
    readonly b: X,
    readonly c: X,
    readonly d: X,
  ) {}

  get all(): X[] {
    return [this.a, this.b, this.c, this.d];
  }

  toString(): string {
    return `${String(this.a)} ${String(this.b)} ${String(this.c)} ${String(this.d)}`;
  }
}
