/**
 * Compaction behaviour.
 * old→new: Java Test9 (CompactionTests) → test_22_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_22_01_GlyphsLengthsAreMinimal1",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="some stupidly long named glyph" />
    <kite9-arrow id="drinks" label="drinks" />
    <kite9-glyph id="two" label="two" />
    <kite9-arrow id="thinks" label="thinks" />
    <kite9-glyph id="three" label="three" />
    {link("l1", "drinks", "one", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l2", "drinks", "two")}
    {link("l3", "thinks", "three")}
    {link("l4", "thinks", "one", { drawDirection: "up", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_22_02_ConstrainedBox2",
  <kite9-diagram id="D">
    <kite9-glyph id="TL" label="TL" />
    <kite9-glyph id="TR" label="TR" />
    <kite9-glyph id="BL" label="BL" />
    <kite9-glyph id="BR" label="BR" />
    <kite9-arrow id="t" label="top" />
    <kite9-arrow id="l" label="left" />
    <kite9-arrow id="b" label="bottom" />
    <kite9-arrow id="r" label="right" />
    {link("l1", "t", "TL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l2", "t", "TR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l3", "b", "BL", { drawDirection: "left", toDecoration: "ARROW" })}
    {link("l4", "b", "BR", { drawDirection: "right", toDecoration: "ARROW" })}
    {link("l5", "l", "TL", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l6", "l", "BL", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l7", "r", "TR", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l8", "r", "BR", { drawDirection: "down", toDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_22_03_SeparateDirectedArrows2",
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
  "test_22_04_HierarchicalContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3">
      <kite9-container id="b1">
        <kite9-glyph id="one" label="one" stereotype="Stereo" />
      </kite9-container>
      <kite9-container id="b2">
        <kite9-glyph id="two" label="two" stereotype="Stereo" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_22_05_HierarchicalContainersWithAlignment",
  <kite9-diagram id="The Diagram">
    <kite9-container id="hfh" style="--kite9-min-width: 1000px">
      <kite9-container
        id="b1-outer"
        style="--kite9-sizing: minimize; --kite9-layout: down; --kite9-min-width: 300px"
      >
        <kite9-container
          id="b1"
          style="--kite9-sizing: minimize; --kite9-layout: down; --kite9-horizontal-align: center; --kite9-min-width: 200px"
        >
          <kite9-glyph
            id="one"
            label="one"
            stereotype="Stereo"
            style="--kite9-horizontal-align: left"
          />
        </kite9-container>
        <kite9-glyph id="two" label="two two two two" stereotype="Stereo" />
      </kite9-container>
      <kite9-container
        id="b2"
        style="--kite9-sizing: minimize; --kite9-layout: down"
      >
        <kite9-glyph
          id="three"
          label="three"
          stereotype="Stereo"
          style="--kite9-horizontal-align: right"
        />
        <kite9-glyph id="four" label="four four" stereotype="Stereo" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

// Java: test_22_05_CompactionAlignmentRight (duplicate 9_5 number), @Ignore.
checkLayout(
  "test_22_05_CompactionAlignmentRight",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
  </kite9-diagram>,
  {
    skip: "Java @Ignore: worked by chance before - CenteringAligner doesn't work properly without layout",
  },
);

/**
 * Port of Java `createDiagramInDirection`: chain one→two→three plus one→four
 * all drawn in the same direction.
 * Java additionally asserted every connection's bounding size ≤ 80 in both axes
 * ("Link too long"); that post-check is not expressible via checkLayout yet,
 * so only the constraint checks apply here.
 */
function compactionAlignment(direction: string) {
  return (
    <kite9-diagram id="The Diagram">
      <kite9-glyph id="one" label="One" />
      <kite9-glyph id="two" label="Two" />
      <kite9-glyph id="three" label="Three" />
      <kite9-glyph id="four" label="Four" />
      {link("l1", "one", "two", { drawDirection: direction })}
      {link("l2", "two", "three", { drawDirection: direction })}
      {link("l3", "one", "four", { drawDirection: direction })}
    </kite9-diagram>
  );
}

checkLayout("test_22_06_CompactionAlignmentLeft", compactionAlignment("left"));
checkLayout("test_22_07_CompactionAlignmentDown", compactionAlignment("down"));
checkLayout("test_22_08_CompactionAlignmentUp", compactionAlignment("up"));

checkLayout(
  "test_22_09_CheckHorizontalEdgeShortening",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One" />
    <kite9-glyph id="two" label="Two" />
    <kite9-glyph id="three" label="Three" />
    <kite9-glyph
      id="four"
      label="Four - this one has a really long label to make compaction harder"
    />
    {link("l1", "one", "two", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "two", "three", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l3", "three", "four", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l4", "one", "three")}
    {link("l5", "one", "three")}
  </kite9-diagram>,
);
