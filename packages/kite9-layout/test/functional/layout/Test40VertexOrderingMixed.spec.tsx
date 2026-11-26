/**
 * Vertex ordering with a mix of directed and undirected links.
 * old→new: Java Test28 (VertexOrderingMixed) → test_40_* (renumbered to avoid display clash)
 * TurnLink → plain link.
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import {
  createXContainers,
  glyphIds,
  renderXContainer,
  type Dir,
  type Layout,
} from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

/** [container, glyph] reference into Java `Glyph[][] out`. */
type Ref = [number, number];

type LinkSpec = { from: Ref; to: Ref; dir?: Dir; arrow: boolean };

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

/** Java `new Link/TurnLink` across the two containers of `createXContainers(.., 5, 2)`. */
const x = (from: Ref, to: Ref, dir?: Dir, arrow = true): LinkSpec => ({
  from,
  to,
  dir,
  arrow,
});

/** Java: `createXContainers("g", glyphs, containers, layout)` inside container `co`. */
function mixed(
  glyphs: number,
  containers: number,
  specs: LinkSpec[],
  containerLayout?: Layout,
): ComponentChild {
  const cs = createXContainers("g", glyphs, containers, containerLayout);
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

checkLayout(
  "test_40_01_VertexPushing",
  mixed(
    10,
    1,
    [a(2, 1, "left"), a(7, 8, "right"), plain(1, 2)],
    "HORIZONTAL",
  ),
);

checkLayout(
  "test_40_02_VertexPushing",
  mixed(10, 1, [
    a(2, 1, "left"),
    a(7, 8, "right"),
    plain(1, 8),
    a(4, 5, "left"),
    a(6, 8, "right"),
    plain(5, 0),
  ]),
);

checkLayout(
  "test_40_03_BigERelaxed",
  mixed(5, 2, [
    x([0, 0], [0, 1], "right"),
    x([0, 0], [0, 2], "right"),
    x([0, 0], [0, 3], "right"),
    x([0, 0], [0, 4], "right"),
    x([1, 0], [1, 1], "left"),
    x([1, 0], [1, 2], "left"),
    x([1, 0], [1, 3], "left"),
    x([1, 0], [1, 4], "left"),
    x([1, 1], [0, 1], undefined, false),
    x([1, 1], [0, 3], undefined, false),
    x([1, 2], [0, 2], undefined, false),
    x([1, 3], [0, 1], undefined, false),
  ]),
);

checkLayout(
  "test_40_04_FragmentDirected",
  mixed(6, 1, [
    a(0, 1, "right"),
    a(2, 3, "right"),
    a(3, 4, "down"),
    a(4, 5, "right"),
    plain(1, 2),
  ]),
);

checkLayout(
  "test_40_05_BuddiesAndSeparateOrderMerging",
  mixed(8, 1, [
    a(0, 1, "right"),
    a(2, 3, "right"),
    a(4, 5, "right"),
    a(6, 7, "right"),
    plain(0, 2),
    plain(2, 4),
    plain(4, 6),
    plain(1, 3),
    plain(3, 5),
    plain(5, 7),
  ]),
);
