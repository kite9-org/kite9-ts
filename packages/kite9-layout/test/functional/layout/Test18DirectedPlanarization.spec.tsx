/**
 * Directed planarization: directed links, buddies, merges, containers.
 * old→new: Test18DirectedPlanarization → test_18_01…test_18_25 (no 18_15 in Java; 18_22 skipped as @NotAddressed)
 * TurnLink / HopLink → `link(..., { linkTest: "turn"|"hop" })` (Java LINK_TEST).
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Glyphs whose label equals their id. */
function glyphs(...ids: string[]): ComponentChild[] {
  return ids.map((id) => <kite9-glyph id={id} label={id} />);
}

checkLayout(
  "test_18_01_AtoB",
  <kite9-diagram id="test">
    {glyphs("A", "B")}
    {link("l1", "A", "B", { drawDirection: "up" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_02_FourPointStar",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "E")}
    {link("l1", "A", "C", { drawDirection: "right" })}
    {link("l2", "B", "C", { drawDirection: "down" })}
    {link("l3", "D", "C", { drawDirection: "up" })}
    {link("l4", "E", "C", { drawDirection: "left" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_03_VerticalBoxes",
  <kite9-diagram id="test">
    {glyphs("S", "E", "one", "two", "three")}
    {link("l1", "S", "one", { drawDirection: "right" })}
    {link("l2", "S", "two", { drawDirection: "right" })}
    {link("l3", "S", "three", { drawDirection: "right" })}
    {link("l4", "E", "one", { drawDirection: "left" })}
    {link("l5", "E", "two", { drawDirection: "left" })}
    {link("l6", "E", "three", { drawDirection: "left" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_04_FourPointCross",
  <kite9-diagram id="test">
    {glyphs("A1", "B1", "C", "D1", "E1", "A2", "B2", "D2", "E2")}
    {link("l1", "A1", "C", { drawDirection: "right" })}
    {link("l2", "B1", "C", { drawDirection: "down" })}
    {link("l3", "D1", "C", { drawDirection: "up" })}
    {link("l4", "E1", "C", { drawDirection: "left" })}
    {link("l5", "A2", "C", { drawDirection: "right" })}
    {link("l6", "B2", "C", { drawDirection: "down" })}
    {link("l7", "D2", "C", { drawDirection: "up" })}
    {link("l8", "E2", "C", { drawDirection: "left" })}
    {link("l9", "A1", "A2", { drawDirection: "down" })}
    {link("l10", "B1", "B2", { drawDirection: "right" })}
    {link("l11", "D1", "D2", { drawDirection: "right" })}
    {link("l12", "E1", "E2", { drawDirection: "down" })}
  </kite9-diagram>,
);

// @see http://www.kite9.com/content/non-optimal-creation-routes-ie-one-route-prevents-another
checkLayout(
  "test_18_05_FourPointStarWithLoop",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "E")}
    {link("l1", "A", "C", { drawDirection: "right" })}
    {link("l2", "B", "C", { drawDirection: "down" })}
    {link("l3", "D", "C", { drawDirection: "up" })}
    {link("l4", "E", "C", { drawDirection: "left" })}
    {/* the loop - must go round the outside (Java TurnLink) */}
    {link("loop", "A", "E", { linkTest: "turn" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_06_UndirectedMultiple",
  <kite9-diagram id="dia">
    <kite9-glyph id="from" label="From" />
    <kite9-glyph id="to" label="To" />
    <kite9-arrow id="a" label="a" />
    <kite9-arrow id="b" label="b" />
    <kite9-arrow id="c" label="c" />
    <kite9-arrow id="d" label="d" />
    <kite9-arrow id="e" label="e" />
    {link("f1", "from", "a", { linkTest: "turn" })}
    {link("f2", "from", "b", { linkTest: "turn" })}
    {link("f3", "from", "c", { linkTest: "turn" })}
    {link("f4", "from", "d", { linkTest: "turn" })}
    {link("f5", "from", "e", { linkTest: "turn" })}
    {link("t1", "to", "a", { linkTest: "turn" })}
    {link("t2", "to", "b", { linkTest: "turn" })}
    {link("t3", "to", "c", { linkTest: "turn" })}
    {link("t4", "to", "d", { linkTest: "turn" })}
    {link("t5", "to", "e", { linkTest: "turn" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_07_TrickyBuddyTop",
  <kite9-diagram id="dia">
    {glyphs("flat", "buda", "budb", "buda2", "budb2", "mid1", "mid2")}
    {link("l1", "flat", "buda", { drawDirection: "down" })}
    {link("l2", "flat", "budb", { drawDirection: "down" })}
    {link("l3", "buda", "buda2", { drawDirection: "down" })}
    {link("l4", "budb", "budb2", { drawDirection: "down" })}
    {link("l5", "mid1", "mid2", { drawDirection: "down" })}
    {/* tricky part */}
    {link("l6", "budb2", "mid2", { drawDirection: "left" })}
    {link("l7", "buda2", "mid2", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_08_TrickyBuddyLeft",
  <kite9-diagram id="dia">
    {glyphs("flat", "buda", "budb", "buda2", "budb2", "mid1", "mid2")}
    {link("l1", "flat", "buda", { drawDirection: "right" })}
    {link("l2", "flat", "budb", { drawDirection: "right" })}
    {link("l3", "buda", "buda2", { drawDirection: "right" })}
    {link("l4", "budb", "budb2", { drawDirection: "right" })}
    {link("l5", "mid1", "mid2", { drawDirection: "right" })}
    {/* tricky part */}
    {link("l6", "budb2", "mid2", { drawDirection: "up" })}
    {link("l7", "buda2", "mid2", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_09_FourPointStar4Middle",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "m1", "m2", "m3", "m4")}
    {link("l1", "A", "m1", { drawDirection: "right", linkTest: "hop" })}
    {link("l2", "A", "m4", { drawDirection: "right", linkTest: "hop" })}
    {link("l3", "B", "m1", { drawDirection: "down", linkTest: "hop" })}
    {link("l4", "B", "m2", { drawDirection: "down", linkTest: "hop" })}
    {link("l5", "C", "m4", { drawDirection: "up", linkTest: "hop" })}
    {link("l6", "C", "m3", { drawDirection: "up", linkTest: "hop" })}
    {link("l7", "D", "m2", { drawDirection: "left", linkTest: "hop" })}
    {link("l8", "D", "m3", { drawDirection: "left", linkTest: "hop" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_10_TrickyBuddyTopVariation",
  <kite9-diagram id="dia">
    {glyphs("flat", "buda", "budb", "buda2", "budb2", "mid1", "mid2")}
    {link("l1", "flat", "buda", { drawDirection: "down" })}
    {link("l2", "flat", "budb", { drawDirection: "down" })}
    {link("l3", "buda", "buda2", { drawDirection: "down" })}
    {link("l4", "budb", "budb2", { drawDirection: "down" })}
    {link("l5", "mid1", "mid2", { drawDirection: "right" })}
    {/* tricky part */}
    {link("l6", "budb2", "mid2", { drawDirection: "left" })}
    {link("l7", "buda2", "mid1", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_11_SimpleBuddyLeft",
  <kite9-diagram id="dia">
    {glyphs("flat", "buda", "budb", "mid1")}
    {link("l1", "flat", "buda", { drawDirection: "right" })}
    {link("l2", "flat", "budb", { drawDirection: "right" })}
    {/* tricky part */}
    {link("l3", "buda", "mid1", { drawDirection: "up" })}
    {link("l4", "budb", "mid1", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_12_TrickySSingleDirectedMerge",
  <kite9-diagram id="dia">
    {glyphs("a", "b")}
    <kite9-container id="c" />
    {glyphs("d", "e")}
    {/* creating an 'S' shape */}
    {link("l1", "a", "b", { drawDirection: "right" })}
    {link("l2", "b", "c", { drawDirection: "down" })}
    {link("l3", "c", "d", { drawDirection: "down" })}
    {link("l4", "d", "e", { drawDirection: "right" })}
    {/* tricky bit, crossing the 's' like a dollar sign */}
    {link("l5", "a", "e", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_13_TrickySSingleDirectedMergeUsingInternalGlyphs",
  <kite9-diagram id="dia">
    {glyphs("a", "b")}
    <kite9-container id="c">{glyphs("c1", "c2")}</kite9-container>
    {glyphs("d", "e")}
    {/* creating an 'S' shape */}
    {link("l1", "a", "b", { drawDirection: "right" })}
    {link("l2", "b", "c1", { drawDirection: "down" })}
    {link("l3", "c2", "c1", { drawDirection: "right", linkTest: "hop" })}
    {link("l4", "c2", "d", { drawDirection: "down" })}
    {link("l5", "d", "e", { drawDirection: "right" })}
    {/* tricky bit, crossing the 's' like a dollar sign (Java HopLink) */}
    {link("l6", "a", "e", { drawDirection: "down", linkTest: "hop" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_14_TrickyOverlappingProblem",
  <kite9-diagram id="dia">
    {glyphs("x3y0")}
    {glyphs("x0y0")}
    <kite9-container id="y1c">{glyphs("x2y1", "x4y1")}</kite9-container>
    <kite9-container id="y2c">{glyphs("x1y2", "x3y2")}</kite9-container>
    {glyphs("x0y1", "x0y2", "x1y3", "x2y3", "x3y3", "x4y3")}
    {link("l1", "x2y1", "x4y1", { drawDirection: "right", linkTest: "hop" })}
    {link("l2", "x1y2", "x3y2", { drawDirection: "right", linkTest: "hop" })}
    {link("l3", "x3y0", "x3y2", { drawDirection: "down", linkTest: "hop" })}
    {link("l4", "x0y0", "x3y0", { drawDirection: "right" })}
    {link("l5", "x0y1", "y1c", { drawDirection: "right" })}
    {link("l6", "x0y2", "y2c", { drawDirection: "right" })}
    {link("l7", "x0y0", "x0y1", { drawDirection: "down" })}
    {link("l8", "x0y1", "x0y2", { drawDirection: "down" })}
    {link("l9", "x1y2", "x1y3", { drawDirection: "down" })}
    {link("l10", "x2y1", "x2y3", { drawDirection: "down", linkTest: "hop" })}
    {link("l11", "x3y2", "x3y3", { drawDirection: "down" })}
    {link("l12", "x4y1", "x4y3", { drawDirection: "down" })}
    {link("l13", "x1y3", "x2y3", { drawDirection: "right" })}
    {link("l14", "x2y3", "x3y3", { drawDirection: "right" })}
    {link("l15", "x3y3", "x4y3", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_16_FlemishBond",
  <kite9-diagram id="dia" layout="DOWN">
    <kite9-container id="a" layout="RIGHT">
      <kite9-container id="ac1" layout="RIGHT">
        {glyphs("a1", "a2")}
      </kite9-container>
      <kite9-container id="ac2" layout="RIGHT">
        {glyphs("a3", "a4")}
      </kite9-container>
      {glyphs("a5")}
    </kite9-container>
    <kite9-container id="b" layout="RIGHT">
      {glyphs("b1")}
      <kite9-container id="bc1" layout="RIGHT">
        {glyphs("b2", "b3")}
      </kite9-container>
      <kite9-container id="bc2" layout="RIGHT">
        {glyphs("b4", "b5")}
      </kite9-container>
    </kite9-container>
    {link("l1", "a1", "b1", { drawDirection: "down" })}
    {link("l2", "a2", "b2", { drawDirection: "down" })}
    {link("l3", "a3", "b3", { drawDirection: "down" })}
    {link("l4", "a4", "b4", { drawDirection: "down" })}
    {link("l5", "a5", "b5", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_17_UnavoidableCrossing",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "m1", "m2", "m3", "m4")}
    {link("l1", "A", "C", { drawDirection: "right", linkTest: "hop" })}
    {link("l2", "A", "B", { drawDirection: "right", linkTest: "hop" })}
    {link("l3", "B", "m1", { drawDirection: "up", linkTest: "hop" })}
    {link("l4", "B", "m3", { drawDirection: "down", linkTest: "hop" })}
    {link("l5", "C", "m2", { drawDirection: "up", linkTest: "hop" })}
    {link("l6", "C", "m4", { drawDirection: "down", linkTest: "hop" })}
    {link("l7", "m1", "m2", { drawDirection: "left", linkTest: "hop" })}
    {link("l8", "m3", "m4", { drawDirection: "left", linkTest: "hop" })}
    {/* trickier... l9 is plain Link in Java; l10 is HopLink */}
    {link("l9", "B", "D", { drawDirection: "right" })}
    {link("l10", "C", "D", { drawDirection: "right", linkTest: "hop" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_18_CuriousNeighbours1",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "m1", "m2")}
    {link("l1", "A", "C", { drawDirection: "down" })}
    {link("l2", "A", "B", { drawDirection: "down" })}
    {link("l3", "C", "m1", { drawDirection: "right" })}
    {link("l4", "D", "m2", { drawDirection: "right" })}
    {link("l5", "m1", "m2", { drawDirection: "down" })}
    {link("l6", "D", "B", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_19_CuriousNeighbours2",
  <kite9-diagram id="test">
    {glyphs("A", "B", "C", "D", "E")}
    {link("l1", "A", "C", { drawDirection: "down" })}
    {link("l2", "A", "B", { drawDirection: "down" })}
    {link("l3", "C", "E", { drawDirection: "right" })}
    {link("l4", "D", "E", { drawDirection: "right" })}
    {link("l5", "D", "B", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_20_PavementContainers",
  <kite9-diagram id="test">
    <kite9-container id="up">{glyphs("tl", "tm")}</kite9-container>
    <kite9-container id="right">{glyphs("tr", "mr")}</kite9-container>
    <kite9-container id="left">{glyphs("ml", "bl")}</kite9-container>
    <kite9-container id="bottom">{glyphs("bm", "br")}</kite9-container>
    {glyphs("mm")}
    {link("l1", "tl", "tm", { drawDirection: "right" })}
    {link("l2", "tm", "tr", { drawDirection: "right" })}
    {link("l3", "ml", "mm", { drawDirection: "right" })}
    {link("l4", "mm", "mr", { drawDirection: "right" })}
    {link("l5", "bl", "bm", { drawDirection: "right" })}
    {link("l6", "bm", "br", { drawDirection: "right" })}
    {link("l7", "tl", "ml", { drawDirection: "down" })}
    {link("l8", "ml", "bl", { drawDirection: "down" })}
    {link("l9", "tm", "mm", { drawDirection: "down" })}
    {link("l10", "mm", "bm", { drawDirection: "down" })}
    {link("l11", "tr", "mr", { drawDirection: "down" })}
    {link("l12", "mr", "br", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_21_BuddyOutsideContainer",
  <kite9-diagram id="test">
    <kite9-container id="up" layout="DOWN">
      {glyphs("A", "B", "C")}
    </kite9-container>
    {glyphs("1", "2", "3", "4")}
    {link("l1", "A", "1", { drawDirection: "up" })}
    {link("l2", "A", "3", { drawDirection: "down" })}
    {link("l3", "C", "2", { drawDirection: "up" })}
    {link("l4", "C", "4", { drawDirection: "down" })}
    {link("l5", "1", "2", { drawDirection: "right" })}
    {link("l6", "3", "4", { drawDirection: "right" })}
  </kite9-diagram>,
);

// Java: @NotAddressed("Goes wrong sometimes, not identified why yet")
checkLayout(
  "test_18_22_WrongVerticalOrdering",
  <kite9-diagram id="dia" />,
  { skip: "NotAddressed: goes wrong sometimes, not identified why yet" },
);

checkLayout(
  "test_18_23_MultipleContainerMerges",
  <kite9-diagram id="dia">
    {glyphs("a")}
    <kite9-container id="bs" layout="DOWN">
      <kite9-container id="bc1">{glyphs("b1")}</kite9-container>
      <kite9-container id="bc2">{glyphs("b2")}</kite9-container>
    </kite9-container>
    {link("l1", "a", "b1", { drawDirection: "right" })}
    {link("l2", "a", "b2", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_24_MultipleContainerMerges2",
  <kite9-diagram id="dia">
    {glyphs("a")}
    <kite9-container id="bc" layout="VERTICAL">
      <kite9-container id="b" layout="VERTICAL">
        {glyphs("b1", "b2")}
      </kite9-container>
      <kite9-container id="c" layout="VERTICAL">
        {glyphs("c1", "c2")}
      </kite9-container>
    </kite9-container>
    {glyphs("d")}
    {link("l1", "a", "b1", { drawDirection: "right" })}
    {link("l2", "a", "c1", { drawDirection: "right" })}
    {link("l3", "d", "b2", { drawDirection: "left" })}
    {link("l4", "d", "c2", { drawDirection: "left" })}
  </kite9-diagram>,
);

checkLayout(
  "test_18_25_MultipleContainerMerges3",
  <kite9-diagram id="dia">
    {glyphs("a")}
    <kite9-container id="bs" layout="DOWN">
      <kite9-container id="bc1">{glyphs("b1")}</kite9-container>
      <kite9-container id="bc2">{glyphs("b2")}</kite9-container>
    </kite9-container>
    <kite9-container id="cs">{glyphs("c1", "c2")}</kite9-container>
    {link("l1", "a", "c1", { drawDirection: "right" })}
    {link("l2", "a", "c2", { drawDirection: "right" })}
    {link("l3", "c1", "b1", { drawDirection: "right" })}
    {link("l4", "c2", "b2", { drawDirection: "right" })}
  </kite9-diagram>,
);
