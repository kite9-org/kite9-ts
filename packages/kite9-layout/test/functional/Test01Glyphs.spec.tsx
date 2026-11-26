/**
 * Glyph / arrow / container basics.
 * old→new: Test1 (1_1,1_2,1_3,1_5,1_6,1_7,1_8) → test_01_01…test_01_06
 */
import { checkLayout } from "./helpers/check-layout.js";

checkLayout(
  "test_01_01_Glyph",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="g1" label={"Rob's Glyph"} />
  </kite9-diagram>,
);

checkLayout(
  "test_01_02_GlyphInContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="Context">
      <kite9-glyph id="g1" label={"Rob's Glyph"} />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_01_03_TwoGlyphs",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="g1" label="One" />
    <kite9-glyph id="g2" label="Two" />
  </kite9-diagram>,
);

checkLayout(
  "test_01_04_TwoArrows",
  <kite9-diagram id="The Diagram">
    <kite9-arrow id="a1" label="One" />
    <kite9-arrow id="a2" label="Two" />
  </kite9-diagram>,
);

checkLayout(
  "test_01_05_TwoGlyphsInContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="Context">
      <kite9-glyph id="g1" label={"Rob's Glyph"} />
      <kite9-glyph id="g2" label="Two" />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_01_06_TwoArrowsInContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="Context">
      <kite9-arrow id="a1" label="One" />
      <kite9-arrow id="a2" label="Two" />
    </kite9-container>
  </kite9-diagram>,
);
