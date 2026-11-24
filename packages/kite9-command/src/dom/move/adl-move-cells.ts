import {
  GRID_OCCUPIES_X_PROPERTY,
  GRID_OCCUPIES_Y_PROPERTY,
} from "@kite9/css";
import type { IntegerRange } from "@kite9/model";
import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { formatIntegerRange } from "../../abstract-command-context.js";
import { AbstractDomCommand } from "../abstract-dom-command.js";

/**
 * Makes space in a grid for new cells. Understands `--kite9-occupies-x/y`.
 */
export class AdlMoveCells extends AbstractDomCommand {
  readonly type = "AdlMoveCells";

  push = 0;
  from = 0;
  horiz = false;
  fragmentId: string | null = null;
  excludedIds: string[] = [];

  apply(ctx: CommandContext): Mismatch | null {
    return this.doMove(this.push, ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    return this.doMove(-this.push, ctx);
  }

  private doMove(push: number, ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    const container = this.findFragmentElement(this.fragmentId, ctx);
    if (container == null) {
      return mismatch(`Couldn't find container ${this.fragmentId}`);
    }

    let moved = 0;
    const contents = container.childNodes;
    for (let i = 0; i < contents.length; i++) {
      const item = contents.item(i);
      if (!(item instanceof Element)) continue;
      const id = item.getAttribute("id") ?? "";
      if (this.excludedIds.includes(id)) continue;
      const r = this.getRange(item, this.horiz, ctx);
      if (r == null) continue;
      if (r.from >= this.from) {
        this.setRange(
          item,
          this.horiz,
          { from: r.from + push, to: r.to + push },
          ctx,
        );
        moved++;
      } else if (r.to >= this.from) {
        this.setRange(
          item,
          this.horiz,
          { from: r.from, to: r.to + push },
          ctx,
        );
        moved++;
      }
    }

    ctx.log(
      `Processed move from ${this.from} push ${push} horiz=${this.horiz},moved=${moved}`,
    );
    return null;
  }

  private checkProperties(): void {
    this.ensureNotNull("fragmentId", this.fragmentId);
    this.ensureNotNull("from", this.from);
    this.ensureNotNull("push", this.push);
  }

  private getRange(
    el: Element,
    horiz: boolean,
    ctx: CommandContext,
  ): IntegerRange | null {
    return horiz
      ? ctx.getStyleRangeValue(el, GRID_OCCUPIES_X_PROPERTY)
      : ctx.getStyleRangeValue(el, GRID_OCCUPIES_Y_PROPERTY);
  }

  private setRange(
    el: Element,
    horiz: boolean,
    r: IntegerRange,
    ctx: CommandContext,
  ): void {
    const value = formatIntegerRange(r);
    if (horiz) {
      ctx.setStyleValue(el, GRID_OCCUPIES_X_PROPERTY, value);
    } else {
      ctx.setStyleValue(el, GRID_OCCUPIES_Y_PROPERTY, value);
    }
  }
}
