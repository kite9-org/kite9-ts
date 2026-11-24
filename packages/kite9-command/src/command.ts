import type { CommandContext } from "./command-context.js";

/** Soft precondition failure — diagram changed since the command was issued. */
export type Mismatch = {
  explain(): string;
};

export function mismatch(message: string): Mismatch {
  return { explain: () => message };
}

/**
 * Unit of change against a light-DOM diagram root held by {@link CommandContext}.
 * `type` is the JSON / OT-stream discriminant.
 */
export interface Command {
  readonly type: string;
  apply(ctx: CommandContext): Mismatch | null;
  undo(ctx: CommandContext): Mismatch | null;
}
