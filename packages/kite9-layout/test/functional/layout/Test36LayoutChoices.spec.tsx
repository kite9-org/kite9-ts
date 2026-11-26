/**
 * Layout choices: combs, pyramids, nested directed containers.
 * old→new: Test36LayoutChoices → test_36_01…test_36_14
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Java `checkMidConnections()` → false (pyramids usually don't centre). */
const opts = { checks: { checkMidConnection: false } };

type Dir = "up" | "down" | "left" | "right" | undefined;

const glyph = (id: string): ComponentChild => (
  <kite9-glyph id={id} label={id} />
);

/** Java `createLink`: directed when `going` set, otherwise a TurnLink (undirected). */
function pairLinks(
  going: Dir,
  pairs: [string, string][],
  prefix = "l",
): ComponentChild[] {
  return pairs.map(([f, t], i) =>
    link(`${prefix}${i + 1}`, f, t, { drawDirection: going }),
  );
}

function doNestedDirected(
  cl1: string | undefined,
  cl2: string | undefined,
  dl: string | undefined,
  going: Dir,
): ComponentChild {
  return (
    <kite9-diagram id="D" layout={dl}>
      <kite9-container id="con1" label="c1" layout={cl1}>
        {glyph("g0")}
        {glyph("g1")}
        {glyph("g2")}
      </kite9-container>
      <kite9-container id="con2" label="c2" layout={cl2}>
        {glyph("g3")}
        {glyph("g4")}
      </kite9-container>
      {pairLinks(going, [
        ["g1", "g4"],
        ["g2", "g3"],
        ["g0", "g3"],
      ])}
    </kite9-diagram>
  );
}

function doSimpleComb(
  cl: string | undefined,
  dl: string | undefined,
  going: Dir,
  misorder: boolean,
): ComponentChild {
  const con1 = misorder
    ? ["g3", "g2", "g0", "g1", "g4", "g5"]
    : ["g0", "g1", "g2", "g3", "g4", "g5"];
  const con2 = misorder
    ? ["gn0", "gn4", "gn3", "gn1", "gn2"]
    : ["gn0", "gn1", "gn2", "gn3", "gn4"];
  return (
    <kite9-diagram id="D" layout={dl}>
      <kite9-container id="con1" layout={cl}>
        {con1.map(glyph)}
      </kite9-container>
      <kite9-container id="con2" layout={cl}>
        {con2.map(glyph)}
      </kite9-container>
      {pairLinks(going, [
        ["g0", "gn0"],
        ["g1", "gn0"],
        ["g1", "gn1"],
        ["g2", "gn1"],
        ["g2", "gn2"],
        ["g3", "gn2"],
        ["g3", "gn3"],
        ["g4", "gn3"],
        ["g4", "gn4"],
        ["g5", "gn4"],
      ])}
    </kite9-diagram>
  );
}

const arrow = (id: string): ComponentChild => (
  <kite9-arrow id={id} label={id} />
);

function doArrowComb(
  conl: string | undefined,
  dl: string | undefined,
  going: Dir,
): ComponentChild {
  return (
    <kite9-diagram id="D" layout={dl}>
      <kite9-container id="con1" label="c1" layout={conl}>
        {["g0", "g1", "g2", "g3"].map(glyph)}
      </kite9-container>
      <kite9-container id="con2" label="c2" layout={conl}>
        {["g4", "g5", "g6"].map(glyph)}
      </kite9-container>
      <kite9-container id="cona" label="con a" layout={conl}>
        {["a6", "a5", "a4", "a3", "a2", "a1"].map(arrow)}
      </kite9-container>
      {pairLinks(going, [
        ["g0", "a1"],
        ["g1", "a2"],
        ["g1", "a3"],
        ["g2", "a4"],
        ["g2", "a5"],
        ["g3", "a6"],
        ["a1", "g4"],
        ["a2", "g4"],
        ["a3", "g5"],
        ["a4", "g5"],
        ["a5", "g6"],
        ["a6", "g6"],
      ])}
    </kite9-diagram>
  );
}

function doPyramid(
  l: string | undefined,
  dl: string | undefined,
  going: Dir,
): ComponentChild {
  return (
    <kite9-diagram id="D" layout={dl}>
      <kite9-container id="con1" label="c1" layout={l}>
        {glyph("g0")}
      </kite9-container>
      <kite9-container id="con2" label="c2" layout={l}>
        {["g1", "g2"].map(glyph)}
      </kite9-container>
      <kite9-container id="con3" label="c3" layout={l}>
        {["g3", "g4", "g5", "g6"].map(glyph)}
      </kite9-container>
      <kite9-container id="coa4" label="con a" layout={l}>
        {["a6", "a5", "a4", "a3", "a7", "a8", "a2", "a1"].map(arrow)}
      </kite9-container>
      {pairLinks(going, [
        ["g1", "g0"],
        ["g2", "g0"],
        ["g3", "g1"],
        ["g4", "g1"],
        ["g5", "g2"],
        ["g6", "g2"],
      ])}
      {pairLinks(
        going,
        [
          ["a1", "g3"],
          ["a2", "g3"],
          ["a3", "g4"],
          ["a4", "g4"],
          ["a5", "g5"],
          ["a6", "g5"],
          ["a7", "g6"],
          ["a8", "g6"],
        ],
        "m",
      )}
    </kite9-diagram>
  );
}

checkLayout(
  "test_36_01_SimpleCombHorizontal",
  doSimpleComb("HORIZONTAL", "VERTICAL", "up", true),
  opts,
);

checkLayout(
  "test_36_02_NestedDirectedSlack",
  doNestedDirected("RIGHT", undefined, "VERTICAL", "up"),
  opts,
);

checkLayout(
  "test_36_05_SimpleCombSlack",
  doSimpleComb(undefined, "VERTICAL", "up", true),
  opts,
);

checkLayout(
  "test_36_06_SimpleCombSlackAll",
  // going = null → TurnLinks (no draw direction)
  doSimpleComb(undefined, undefined, undefined, true),
  opts,
);

checkLayout(
  "test_36_07_ArrowCombHorizontal",
  doArrowComb("HORIZONTAL", "VERTICAL", "up"),
  opts,
);

checkLayout(
  "test_36_08_ArrowCombSlack",
  doArrowComb(undefined, "VERTICAL", "up"),
  opts,
);

checkLayout(
  "test_36_09_PyramidHoriz",
  doPyramid("HORIZONTAL", "VERTICAL", "up"),
  opts,
);

checkLayout(
  "test_36_10_PyramidVert",
  doPyramid("VERTICAL", "HORIZONTAL", "right"),
  opts,
);

checkLayout(
  "test_36_11_PyramidSlack",
  doPyramid(undefined, "VERTICAL", "up"),
  opts,
);

checkLayout(
  "test_36_12_PyramidSlack2",
  doPyramid(undefined, undefined, "up"),
  opts,
);

checkLayout(
  "test_36_13_ArrowCombVertical",
  doArrowComb("VERTICAL", "HORIZONTAL", "left"),
  opts,
);

// Java additionally asserts g5…g0 and gn4…gn0 are ordered UP or DOWN
// (assertDirection on the rendered SVG); that post-check is not ported.
checkLayout(
  "test_36_14_SimpleCombSlackAllButOrdered",
  doSimpleComb("VERTICAL", undefined, undefined, false),
  opts,
);
