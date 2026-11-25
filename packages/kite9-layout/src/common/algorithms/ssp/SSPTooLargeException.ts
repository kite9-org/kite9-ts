import { LogicException } from "../../../logging/LogicException.js";

/**
 * This is caused when there is an out of memory error, or a limit on the size of the ssp
 * state gets too big.
 */
export class SSPTooLargeException extends LogicException {
  constructor(message: string) {
    super(message);
  }
}
