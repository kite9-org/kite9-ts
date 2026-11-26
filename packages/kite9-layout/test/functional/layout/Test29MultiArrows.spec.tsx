/**
 * Arrow hubs linking several glyphs.
 * old→new: Java Test3 (MultiArrows) → test_29_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_29_01_3Glyphs1ArrowFinal",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "meets", "one")}
    {link("l2", "meets", "two")}
    {link("l3", "meets", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_29_02_4Glyphs2Arrows",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-glyph id="four" label="Four" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="eats" label="eats" />
    {link("l1", "meets", "one")}
    {link("l2", "meets", "two")}
    {link("l3", "meets", "three")}
    {link("l4", "eats", "two")}
    {link("l5", "eats", "three")}
    {link("l6", "eats", "four")}
  </kite9-diagram>,
);

checkLayout(
  "test_29_03_4Glyphs3Arrows",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" stereotype="Stereo" />
    <kite9-glyph id="two" label="Two" stereotype="Stereo" />
    <kite9-glyph id="three" label="Three" />
    <kite9-glyph id="four" label="Four" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="eats" label="eats" />
    <kite9-arrow id="gets" label="gets" />
    {link("l1", "meets", "one")}
    {link("l2", "meets", "two")}
    {link("l3", "meets", "three")}
    {link("l4", "eats", "two")}
    {link("l5", "eats", "three")}
    {link("l6", "eats", "four")}
    {link("l7", "gets", "one")}
    {link("l8", "gets", "three")}
    {link("l9", "gets", "four")}
  </kite9-diagram>,
);

checkLayout(
  "test_29_04_4Glyphs3PointArrows",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="g1" label="One" stereotype="Stereo" />
    <kite9-glyph id="g2" label="Two" stereotype="Stereo" />
    <kite9-glyph id="g3" label="Three" />
    <kite9-glyph id="g4" label="Four" />
    <kite9-arrow id="a1" label="a1" />
    <kite9-arrow id="a2" label="a2" />
    <kite9-arrow id="a3" label="a3" />
    {link("l1", "a1", "g1")}
    {link("l2", "a1", "g2")}
    {link("l3", "a1", "g3")}
    {link("l4", "a2", "g2")}
    {link("l5", "a2", "g3")}
    {link("l6", "a2", "g4")}
    {link("l7", "a3", "g1")}
    {link("l8", "a3", "g3")}
    {link("l9", "a3", "g4")}
  </kite9-diagram>,
);
