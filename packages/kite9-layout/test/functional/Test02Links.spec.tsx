/**
 * Links via arrow hubs.
 * old→new: Test2 (2_2–2_7) → test_2_1…test_2_6
 */
import { checkLayout } from "./helpers/check-layout.js";

checkLayout(
  "test_02_01_TwoGlyphsArrow",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-link id="l1">
      <from reference="meets" />
      <to reference="one" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l2">
      <from reference="meets" />
      <to reference="two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);

checkLayout(
  "test_02_02_TwoGlyphsHeadedArrow",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-link id="l1">
      <from reference="meets" />
      <to reference="one" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l2">
      <from reference="meets" />
      <to reference="two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>ARROW</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);

checkLayout(
  "test_02_03_TwoGlyphsTwoArrows",
  <kite9-diagram id="The Diagram" layout="HORIZONTAL">
    <kite9-glyph id="One" label="One" />
    <kite9-glyph id="Two" label="Two" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="eats" label="eats" />
    <kite9-link id="l1" drawDirection="left">
      <from reference="meets" />
      <to reference="One" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l2">
      <from reference="meets" />
      <to reference="Two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l3" drawDirection="up" contradicting>
      <from reference="eats" />
      <to reference="One" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l4" drawDirection="down" contradicting>
      <from reference="eats" />
      <to reference="Two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);

checkLayout(
  "test_02_04_ThreeGlyphsTwoArrows",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-glyph id="three" label="Three" />
    <kite9-arrow id="meets" label="meets" />
    <kite9-arrow id="eats" label="eats" />
    <kite9-link id="l1">
      <from reference="meets" />
      <to reference="one" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l2">
      <from reference="meets" />
      <to reference="two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l3">
      <from reference="eats" />
      <to reference="three" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l4">
      <from reference="eats" />
      <to reference="two" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);

checkLayout(
  "test_02_05_OneGlyphOneArrowSixLinks",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-arrow id="meets" label="meets" />
    {["tl1", "tl2", "tl3", "tl4", "tl5", "tl6"].map((id) => (
      <kite9-link id={id}>
        <from reference="meets" />
        <to reference="one" />
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>NONE</toDecoration>
      </kite9-link>
    ))}
  </kite9-diagram>,
);

checkLayout(
  "test_02_06_OneGlyphOneArrowThreeLinks",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-arrow id="meets" label="meets" />
    {["tl1", "tl2", "tl3"].map((id) => (
      <kite9-link id={id}>
        <from reference="meets" />
        <to reference="one" />
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>NONE</toDecoration>
      </kite9-link>
    ))}
  </kite9-diagram>,
);
