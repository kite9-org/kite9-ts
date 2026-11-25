import { LogicException } from "../../../logging/LogicException.js";

export class SlideableException extends LogicException {
  constructor(s: string, arg0?: unknown) {
    super(s, arg0);
  }
}
