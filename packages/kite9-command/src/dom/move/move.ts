import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractDomCommand } from "../abstract-dom-command.js";

export class Move extends AbstractDomCommand {
  readonly type = "Move";

  moveId: string | null = null;
  from: string | null = null;
  fromBefore: string | null = null;
  to: string | null = null;
  toBefore: string | null = null;

  apply(ctx: CommandContext): Mismatch | null {
    return this.move(this.moveId, this.to, this.toBefore, ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    return this.move(this.moveId, this.from, this.fromBefore, ctx);
  }

  private move(
    moveId: string | null,
    to: string | null,
    toBefore: string | null,
    ctx: CommandContext,
  ): Mismatch | null {
    this.checkProperties();
    const moveEl = ctx.getElementById(moveId);
    const toEl = ctx.getElementById(to);
    const toBeforeEl = ctx.getElementById(toBefore);
    if (moveEl == null || toEl == null) {
      return mismatch(`Element missing, moveEl=${moveEl}, toEl=${toEl}`);
    }
    if (toBeforeEl == null) {
      toEl.appendChild(moveEl);
    } else {
      toEl.insertBefore(moveEl, toBeforeEl);
    }
    ctx.log(`Completed move into ${to}`);
    return null;
  }

  private checkProperties(): void {
    this.ensureNotNull("moveId", this.moveId);
    this.ensureNotNull("from", this.from);
    this.ensureNotNull("to", this.to);
  }
}
