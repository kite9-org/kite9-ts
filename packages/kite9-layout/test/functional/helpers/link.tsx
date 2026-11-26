/** Tiny JSX helpers for functional link fixtures. */

import type { ComponentChild } from "preact";

export function link(
  id: string,
  from: string,
  to: string,
  opts: {
    drawDirection?: string;
    fromDecoration?: string;
    toDecoration?: string;
    fromLabel?: string;
    toLabel?: string;
    contradicting?: boolean;
  } = {},
): ComponentChild {
  const fromDec = opts.fromDecoration ?? "NONE";
  const toDec = opts.toDecoration ?? "NONE";
  return (
    <kite9-link
      id={id}
      drawDirection={opts.drawDirection}
      contradicting={opts.contradicting}
    >
      <from reference={from} />
      <to reference={to} />
      {opts.fromLabel ? (
        <kite9-from-label id={`${id}-fl`}>
          <text>{opts.fromLabel}</text>
        </kite9-from-label>
      ) : null}
      {opts.toLabel ? (
        <kite9-to-label id={`${id}-tl`}>
          <text>{opts.toLabel}</text>
        </kite9-to-label>
      ) : null}
      <fromDecoration>{fromDec}</fromDecoration>
      <toDecoration>{toDec}</toDecoration>
    </kite9-link>
  );
}
