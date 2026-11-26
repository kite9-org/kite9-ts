/**
 * Vertex ordering with directed (draw-direction) arrow links.
 * old→new: Java Test27 (VertexOrderingDirected) → test_39_* (renumbered to avoid display clash)
 * (39_2 and 27_12 are @Ignore; there is no 27_8 in the Java source.)
 * HopLink / TurnLink → plain link (no per-link hop/turn assertion in TS checks).
 */
import type { ComponentChild } from "preact";
import { checkLayout, type CheckLayoutOptions } from "../helpers/check-layout.js";
import {
  createXContainers,
  glyphIds,
  renderXContainer,
  type Dir,
} from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

/** [container, glyph] reference into Java `Glyph[][] out`. */
type Ref = [number, number];

type LinkSpec = {
  from: Ref;
  to: Ref;
  dir?: Dir;
  /** Java `LinkEndStyle.ARROW` as the from-end style. */
  arrow: boolean;
};

/** Java `new Link(a, b, ARROW, null, null, null, dir)` within one container. */
const a = (from: number, to: number, dir?: Dir): LinkSpec => ({
  from: [0, from],
  to: [0, to],
  dir,
  arrow: true,
});

/** Java `new Link(a, b)` / `new TurnLink(a, b)` within one container. */
const plain = (from: number, to: number): LinkSpec => ({
  from: [0, from],
  to: [0, to],
  arrow: false,
});

/** Java `Link` across the two containers of `createXContainers(.., 5, 2)`. */
const x = (from: Ref, to: Ref, dir?: Dir): LinkSpec => ({
  from,
  to,
  dir,
  arrow: true,
});

/** Java: `createXContainers("g", glyphs, containers, …)` inside container `co`. */
function directed(
  glyphs: number,
  containers: number,
  specs: LinkSpec[],
): ComponentChild {
  const cs = createXContainers("g", glyphs, containers);
  const out = glyphIds(cs);
  return (
    <kite9-diagram id="diagram">
      <kite9-container id="co">{cs.map(renderXContainer)}</kite9-container>
      {specs.map((s, i) =>
        link(`l${i + 1}`, out[s.from[0]]![s.from[1]]!, out[s.to[0]]![s.to[1]]!, {
          fromDecoration: s.arrow ? "ARROW" : undefined,
          drawDirection: s.dir,
        }),
      )}
    </kite9-diagram>
  );
}

/** Java overrides `checkMidConnections()` to false ("can't be done for 21_7"). */
const opts: CheckLayoutOptions = { checks: { checkMidConnection: false } };

checkLayout(
  "test_39_01_LooseOrdering",
  directed(10, 1, [
    a(1, 4, "right"),
    a(1, 5, "right"),
    a(2, 6, "right"),
    a(3, 6, "right"),
    a(5, 8, "right"),
    a(6, 8, "right"),
    a(4, 9, "right"),
    a(4, 7, "right"),
  ]),
  opts,
);

checkLayout(
  "test_39_02_ZigZag",
  directed(8, 1, [
    a(1, 2, "right"),
    a(2, 3, "left"),
    a(3, 4, "right"),
    a(4, 5, "left"),
    a(5, 6, "right"),
    a(6, 7, "left"),
    a(7, 0, "right"),
    plain(0, 1),
  ]),
  { ...opts, skip: "Stack overflow issue (Java @Ignore)" },
);

checkLayout(
  "test_39_03_BigE",
  directed(5, 2, [
    x([0, 0], [0, 1], "right"),
    x([0, 0], [0, 2], "right"),
    x([0, 0], [0, 3], "right"),
    x([0, 0], [0, 4], "right"),
    x([1, 0], [1, 1], "left"),
    x([1, 0], [1, 2], "left"),
    x([1, 0], [1, 3], "left"),
    x([1, 0], [1, 4], "left"),
    x([1, 0], [0, 0], "left"),
    x([1, 0], [0, 3], "left"),
    x([1, 2], [0, 2], "left"),
    x([1, 3], [0, 1], "left"),
  ]),
  opts,
);

// see http://www.kite9.com/content/non-optimal-creation-routes-ie-one-route-prevents-another
checkLayout(
  "test_39_04_BigPatch",
  directed(9, 1, [
    a(0, 1, "right"),
    a(0, 2, "right"),
    a(0, 5, "left"),
    a(0, 6, "left"),
    a(0, 7, "up"),
    a(0, 8, "up"),
    a(0, 3, "down"),
    a(0, 4, "down"),
  ]),
  opts,
);

checkLayout(
  "test_39_05_SimpleC",
  directed(6, 1, [
    a(0, 1, "right"),
    a(0, 2, "down"),
    a(2, 3, "right"),
    a(1, 4, "down"),
    a(4, 5, "left"),
    plain(5, 3),
  ]),
  opts,
);

checkLayout(
  "test_39_06_Inner",
  directed(8, 1, [
    a(0, 1, "right"),
    a(0, 2, "down"),
    a(2, 3, "right"),
    a(1, 3, "down"),
    a(4, 5, "right"),
    a(4, 6, "down"),
    a(6, 7, "right"),
    a(5, 7, "down"),
    a(0, 4, "right"),
    a(3, 7, "right"),
  ]),
  opts,
);

checkLayout(
  "test_39_07_HopOver",
  directed(9, 1, [
    // top row
    a(0, 1, "right"),
    a(0, 4, "down"),
    a(1, 7, "down"),
    // next row
    a(2, 3, "right"),
    a(3, 4, "right"),
    a(4, 5, "right"),
    a(3, 6, "down"),
    a(5, 8, "down"),
    // last row
    a(6, 7, "right"),
    a(7, 8, "right"),
  ]),
  opts,
);

checkLayout(
  "test_39_09_NaziCross",
  directed(9, 1, [
    a(0, 1, "right"),
    a(1, 2, "up"),
    a(0, 3, "down"),
    a(3, 4, "right"),
    a(0, 5, "left"),
    a(5, 6, "down"),
    a(0, 7, "up"),
    a(7, 8, "left"),
  ]),
  opts,
);

checkLayout(
  "test_39_10_BuddiesWithDirection",
  directed(7, 1, [
    a(0, 1, "right"),
    a(0, 2, "right"),
    a(0, 3, "right"),
    a(0, 4, "right"),
    a(0, 5, "right"),
    a(0, 6, "right"),
    a(3, 4, "down"),
    a(5, 6, "down"),
  ]),
  opts,
);

checkLayout(
  "test_39_11_NotAdjacentConnections",
  directed(8, 1, [
    // first row
    a(0, 1, "right"),
    a(1, 2, "right"),
    a(2, 3, "right"),
    // second row
    a(5, 7, "right"),
    a(4, 6, "right"),
    // tynes
    a(0, 4, "down"),
    a(1, 5, "down"),
    a(2, 6, "down"),
    a(3, 7, "down"),
  ]),
  opts,
);

checkLayout(
  "test_39_12_ZigZagUD",
  directed(8, 1, [
    a(1, 2, "down"),
    a(2, 3, "up"),
    a(3, 4, "down"),
    a(4, 5, "up"),
    a(5, 6, "down"),
    a(6, 7, "up"),
    a(7, 0, "down"),
    plain(0, 1),
  ]),
  { ...opts, skip: "Currently failing in travis (Java @Ignore)" },
);
