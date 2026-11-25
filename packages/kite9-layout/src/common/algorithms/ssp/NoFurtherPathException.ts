/** Kotlin `NoFurtherPathException(cause: Throwable)` / `(cause: String)`. */
export class NoFurtherPathException extends Error {
  constructor(cause: unknown) {
    super(
      typeof cause === "string" ? cause : String(cause),
      typeof cause === "string" ? undefined : { cause },
    );
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
