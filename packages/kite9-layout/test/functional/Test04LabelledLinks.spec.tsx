/**
 * Labelled links (layout of label boxes, not text wrap).
 * old→new: Test12 (12_1,12_2,12_6,12_8,12_10) → test_4_1…test_4_5
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

checkLayout(
  "test_04_01_LabelledLeftRight",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-arrow id="i1" label="i1" />
    {link("l1", "i1", "a", { drawDirection: "left" })}
    {link("l2", "i1", "b", {
      drawDirection: "right",
      toDecoration: "ARROW",
      fromLabel: "from",
      toLabel: "to",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_04_02_LabelledUpDown",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-arrow id="i1" label="i1" />
    {link("l1", "i1", "a", {
      drawDirection: "up",
      toLabel: "from (right)",
    })}
    {link("l2", "i1", "b", {
      drawDirection: "down",
      toDecoration: "ARROW",
      toLabel: "to (left)",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_04_03_GlyphMultipleLabels",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="hub" label="hub" />
    <kite9-arrow id="a1" label="a1" />
    <kite9-arrow id="a2" label="a2" />
    <kite9-arrow id="a3" label="a3" />
    {link("l1", "a1", "hub", { drawDirection: "up", fromLabel: "one" })}
    {link("l2", "a2", "hub", { drawDirection: "up", fromLabel: "two" })}
    {link("l3", "a3", "hub", { drawDirection: "up", fromLabel: "three" })}
  </kite9-diagram>,
);

checkLayout(
  "test_04_04_LabelledBothEnds",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    {link("l1", "a", "b", {
      drawDirection: "right",
      fromLabel: "from",
      toLabel: "to",
      toDecoration: "ARROW",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_04_05_BlankLabels",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    {link("l1", "a", "b", {
      drawDirection: "right",
      fromLabel: " ",
      toLabel: "",
    })}
  </kite9-diagram>,
);
