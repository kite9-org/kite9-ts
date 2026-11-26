/**
 * Container nesting / order / linked hierarchy.
 * old→new: Test4 (4_1–4_3, 4_5, 4_8; skip 4_4 wrap labels, 4_6 ignore, 4_7 sizing→Wave B) → test_3_1…test_3_5
 */
import { checkLayout } from "./helpers/check-layout.js";

checkLayout(
  "test_03_01_ContainerNesting",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3">
      <kite9-container id="b2">
        <kite9-container id="b1">
          <kite9-glyph id="g1" label={"Rob's Glyph"} />
        </kite9-container>
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_03_02_HierarchicalContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3">
      <kite9-container id="b1">
        <kite9-glyph id="g1" label="one" />
      </kite9-container>
      <kite9-container id="b2">
        <kite9-glyph id="g2" label="two" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_03_03_ContainerContentOrdering",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3" layout="UP">
      <kite9-container id="b1" layout="DOWN">
        <kite9-glyph id="top" label="top" />
        <kite9-glyph id="middle" label="middle" />
        <kite9-glyph id="bottom" label="bottom" />
      </kite9-container>
      <kite9-container id="b2" layout="RIGHT">
        <kite9-glyph id="left" label="left" />
        <kite9-glyph id="middle2" label="middle2" />
        <kite9-glyph id="right" label="right" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_03_04_TurnsInsideContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1" layout="RIGHT">
      <kite9-glyph id="one" label="one" />
    </kite9-container>
    <kite9-container id="b2" layout="RIGHT">
      <kite9-glyph id="two" label="two" />
    </kite9-container>
    <kite9-glyph id="three" label="three" />
    <kite9-glyph id="four" label="four" />
    <kite9-glyph id="five" label="five" />
    <kite9-link id="l1" drawDirection="down">
      <from reference="one" />
      <to reference="three" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l2" drawDirection="down">
      <from reference="two" />
      <to reference="five" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l3" drawDirection="right">
      <from reference="three" />
      <to reference="four" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="l4" drawDirection="right">
      <from reference="four" />
      <to reference="five" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="tl1">
      <from reference="one" />
      <to reference="four" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    <kite9-link id="tl2">
      <from reference="two" />
      <to reference="four" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);

checkLayout(
  "test_03_05_HierarchicalContainersWithLink",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3">
      <kite9-container id="b1">
        <kite9-glyph id="g1" label="one" />
      </kite9-container>
      <kite9-container id="b2">
        <kite9-glyph id="g2" label="two" />
      </kite9-container>
    </kite9-container>
    <kite9-link id="l1">
      <from reference="g1" />
      <to reference="g2" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
  </kite9-diagram>,
);
