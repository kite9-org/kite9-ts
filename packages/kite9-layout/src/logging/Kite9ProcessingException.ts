/**
 * Thrown whenever there is a problem creating the kite9 item.
 * This is to do with input data not matching expectations, and
 * should lead the user back to the understanding of what the issue is.
 */
export class Kite9ProcessingException extends Error {
  constructor(message?: string | null, cause?: Error | null) {
    const msg = message ?? "";
    super(
      cause === undefined
        ? msg
        : correctMessage(msg, cause),
      correctThrowable(cause) != null
        ? { cause: correctThrowable(cause) }
        : undefined,
    );
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Prevents us creating traces with multiple Kite9ProcessingExceptions in them. */
function correctMessage(arg0: string, arg1: Error | null): string {
  return arg1 instanceof Kite9ProcessingException
    ? `${arg0}\n${arg1.message}`
    : arg0;
}

function correctThrowable(arg1: Error | null | undefined): Error | null {
  if (arg1 == null) return null;
  return arg1 instanceof Kite9ProcessingException && arg1.cause != null
    ? (arg1.cause as Error)
    : arg1;
}
