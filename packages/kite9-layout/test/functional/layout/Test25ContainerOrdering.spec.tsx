/**
 * Container ordering (layout direction inside containers) with inside/outside links.
 * old→new: Java Test14 (ContainerOrdering) → test_25_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Java `setUp()`: four glyphs in a RIGHT-ordered container "b1" plus an arrow outside. */
function players(links: ComponentChild): ComponentChild {
  return (
    <kite9-diagram id="The Diagram">
      <kite9-container id="b1" label="inside" layout="RIGHT">
        <kite9-glyph id="a0" label="a0" />
        <kite9-glyph id="a1" label="a1" />
        <kite9-glyph id="a2" label="a2" />
        <kite9-glyph id="a3" label="a3" />
      </kite9-container>
      <kite9-arrow id="outside" label="outside" />
      {links}
    </kite9-diagram>
  );
}

checkLayout(
  "test_25_01_OneOutsideConnection",
  players(link("l1", "outside", "a1")),
);

checkLayout(
  "test_25_02_OneInsideConnection",
  players(link("l1", "a0", "a2")),
);

checkLayout(
  "test_25_03_OneInsideOneOutside",
  players(
    <>
      {link("l1", "outside", "a2")}
      {link("l2", "a0", "a3")}
    </>,
  ),
);

checkLayout(
  "test_25_04_OneInsideAndOutside",
  players(
    <>
      {link("l1", "outside", "a1")}
      {link("l2", "a1", "a3")}
    </>,
  ),
);

// @see http://www.kite9.com/content/planarization-no-merges-available-145
checkLayout(
  "test_25_05_TwoSeparateInside",
  players(
    <>
      {link("l1", "a0", "a2")}
      {link("l2", "a1", "a3")}
    </>,
  ),
);

checkLayout(
  "test_25_06_TwoJoinedInside",
  players(
    <>
      {link("l1", "a0", "a2")}
      {link("l2", "a2", "a3")}
    </>,
  ),
);

checkLayout(
  "test_25_07_contextDirection",
  <kite9-diagram id="my_diagram">
    <kite9-container id="leftToRight" label="Left to Right" layout="RIGHT">
      <kite9-glyph id="g0" label="0" />
      <kite9-glyph id="g1" label="1" />
      <kite9-glyph id="g2" label="2" />
    </kite9-container>
    <kite9-container id="bottomToTop" label="Bottom to Top" layout="UP">
      <kite9-glyph id="g3" label="3" />
      <kite9-glyph id="g4" label="4" />
      <kite9-glyph id="g5" label="5" />
    </kite9-container>
    <kite9-container id="topToBottom" label="Top to Bottom" layout="DOWN">
      <kite9-glyph id="g6" label="6" />
      <kite9-glyph id="g7" label="7" />
      <kite9-glyph id="g8" label="8" />
    </kite9-container>
    <kite9-container id="rightToLeft" label="Right to Left" layout="LEFT">
      <kite9-glyph id="g9" label="9" />
      <kite9-glyph id="g10" label="10" />
      <kite9-glyph id="g11" label="11" />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_25_08_PileOnFour",
  players(
    <>
      {link("l1", "outside", "a3")}
      {link("l2", "a0", "a3")}
      {link("l3", "a1", "a3")}
      {link("l4", "a2", "a3")}
    </>,
  ),
);
