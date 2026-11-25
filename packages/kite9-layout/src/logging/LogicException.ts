/**
 * LogicExceptions are thrown to represent an underlying bug in Kite9
 * Visualization (as opposed to user-error).
 *
 * Mirrors the Kotlin constructors: (), (message), (cause), (message, cause).
 */
export class LogicException extends Error {
  constructor(message?: string | null, cause?: unknown);
  constructor(cause: Error);
  constructor(arg0?: unknown, arg1?: unknown) {
    const fromCause = arg0 instanceof Error && arguments.length === 1;
    const message = fromCause
      ? String(arg0)
      : arg0 == null
        ? undefined
        : String(arg0);
    const cause = fromCause ? arg0 : arg1;
    super(message, cause != null ? { cause } : undefined);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
