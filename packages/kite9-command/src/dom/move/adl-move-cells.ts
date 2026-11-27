import type { IntegerRange } from "@kite9/model";
import { integerRange } from "@kite9/model";
import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractDomCommand } from "../abstract-dom-command.js";

/**
 * Makes space in a grid for new cells.
 * Reads/writes CSS `grid-column` / `grid-row` (1-based lines, exclusive end).
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
    const prop = horiz ? "grid-column" : "grid-row";
    const raw = ctx.getStyleValue(el, prop);
    return parseCssGridLinesToRange(raw);
  }

  private setRange(
    el: Element,
    horiz: boolean,
    r: IntegerRange,
    ctx: CommandContext,
  ): void {
    const prop = horiz ? "grid-column" : "grid-row";
    ctx.setStyleValue(el, prop, formatRangeAsCssGridLines(r));
  }
}

/** CSS `1 / 3` (exclusive end) → 0-based inclusive `{ from: 0, to: 1 }`. */
function parseCssGridLinesToRange(raw: string | null): IntegerRange | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (!v || v === "auto" || v === "auto / auto") return null;
  const parts = v.split("/").map((p) => p.trim());
  const parseLine = (s: string): number | null => {
    if (!s || s === "auto") return null;
    if (/^span\s+/i.test(s)) return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const startLine = parseLine(parts[0] ?? "");
  if (startLine == null) return null;
  let endLine: number | null = null;
  if (parts[1]) {
    const span = /^span\s+(\d+)$/i.exec(parts[1]);
    if (span) {
      const n = Number.parseInt(span[1]!, 10);
      endLine = startLine + (Number.isFinite(n) ? n : 1);
    } else {
      endLine = parseLine(parts[1]);
    }
  }
  const from = startLine - 1;
  const to = endLine != null ? endLine - 2 : from;
  if (from < 0 || to < from) return null;
  return integerRange(from, to);
}

function formatRangeAsCssGridLines(r: IntegerRange): string {
  const startLine = r.from + 1;
  const endLine = r.to + 2; // exclusive
  return `${startLine} / ${endLine}`;
}
