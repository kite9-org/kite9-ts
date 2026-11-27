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
  } = {},
): ComponentChild {
  const fromDec = opts.fromDecoration ?? "NONE";
  const toDec = opts.toDecoration ?? "NONE";
  return (
    <kite9-link id={id} drawDirection={opts.drawDirection}>
      <from reference={from} />
      <to reference={to} />
      <fromDecoration>{fromDec}</fromDecoration>
      <toDecoration>{toDec}</toDecoration>
    </kite9-link>
  );
}
