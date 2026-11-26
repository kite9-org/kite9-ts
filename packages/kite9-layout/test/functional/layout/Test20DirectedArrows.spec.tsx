/**
 * Directed arrows within a single face.
 * old→new: Java Test7 (DirectedArrows) → test_20_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_20_01_OneDirectedArrow",
  <kite9-diagram id="D">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "meets", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "meets", "two")}
    {link("l3", "meets", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_20_02_SeparateDirectedArrows",
  <kite9-diagram id="D">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="sees" label="sees" />
    {link("l1", "meets", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "sees", "two", { drawDirection: "up", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_20_03_SeparateDirectedArrows2",
  <kite9-diagram id="D">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="sees" label="sees" />
    <kite9-arrow id="asks" label="asks" />
    <kite9-arrow id="looks" label="looks" />
    <kite9-glyph id="three" label="Three" />
    <kite9-glyph id="four" label="Four" />
    {link("l1", "meets", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "sees", "two", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l3", "asks", "three", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l4", "looks", "four", { drawDirection: "right", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_20_04_TwoJoinedDirectedArrows",
  <kite9-diagram id="D">
    <kite9-glyph id="One" label="One" />
    <kite9-glyph id="Two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="sees" label="sees" />
    {link("l1", "meets", "One", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "sees", "Two", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l3", "sees", "One")}
    {link("l4", "meets", "Two")}
  </kite9-diagram>,
);

checkLayout(
  "test_20_05_CompletelyConstrainedArrow",
  <kite9-diagram id="D">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "meets", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "meets", "two", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l3", "meets", "three", { drawDirection: "down", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_20_06_CompletelyConstrainedArrow2",
  <kite9-diagram id="D">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "meets", "one", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l2", "meets", "two", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l3", "meets", "three", { drawDirection: "right", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_20_07_ConstrainedBox1",
  <kite9-diagram id="D">
    <kite9-glyph id="TL" label="TL" />
    <kite9-glyph id="TR" label="TR" />
    <kite9-glyph id="BL" label="BL" />
    <kite9-glyph id="BR" label="BR" />
    <kite9-arrow id="top" label="top" />
    <kite9-arrow id="left" label="left" />
    <kite9-arrow id="bottom" label="bottom" />
    <kite9-arrow id="right" label="right" />
    {link("l1", "top", "TL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l2", "top", "TR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l3", "bottom", "BL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l4", "bottom", "BR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l5", "left", "TL", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l6", "left", "BL", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l7", "right", "TR", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l8", "right", "BR")}
  </kite9-diagram>,
);

checkLayout(
  "test_20_08_ConstrainedBox2",
  <kite9-diagram id="D">
    <kite9-glyph id="TL" label="TL" />
    <kite9-glyph id="TR" label="TR" />
    <kite9-glyph id="BL" label="BL" />
    <kite9-glyph id="BR" label="BR" />
    <kite9-arrow id="top" label={"top\ntop\ntop"} />
    <kite9-arrow id="left" label="left lefty left left" />
    <kite9-arrow id="bottom" label="bottom" />
    <kite9-arrow id="right" label="right" />
    {link("l1", "top", "TL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l2", "top", "TR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l3", "bottom", "BL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l4", "bottom", "BR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l5", "left", "TL", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l6", "left", "BL", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l7", "right", "TR", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l8", "right", "BR", { drawDirection: "down", toDecoration: "ARROW" })}
  </kite9-diagram>,
);
