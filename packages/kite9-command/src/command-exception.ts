import type { Command } from "./command.js";

/** Hard failure during command construction/processing (vs soft {@link Mismatch}). */
export class CommandException extends Error {
  readonly status: number;
  readonly commands: readonly Command[];

  constructor(
    status: number,
    message: string,
    command: Command | readonly Command[],
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "CommandException";
    this.status = status;
    this.commands = Array.isArray(command) ? [...command] : [command];
  }
}

export const HTTP_CONFLICT = 409;
export const BAD_REQUEST = 400;
