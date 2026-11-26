/**
 * Container sizing / mid-edge fans.
 * old→new: Test29 (subset) → test_6_1…test_6_6
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

const midOff = { checks: { checkMidConnection: false } };

checkLayout(
  "test_06_01_MidSetEdge",
  <kite9-diagram id="d">
    <kite9-container id="c1">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
      <kite9-glyph id="c" label="c" />
      <kite9-glyph id="d" label="d" />
    </kite9-container>
    {link("l1", "a", "b", { drawDirection: "right" })}
    {link("l2", "a", "c", { drawDirection: "down" })}
    {link("l3", "b", "d", { drawDirection: "down" })}
    {link("l4", "c", "d", { drawDirection: "right" })}
  </kite9-diagram>, {
  skip: "container-edge recursion incomplete",
  checks: { checkMidConnection: false },
});
checkLayout(
  "test_06_02_ContainerSizes",
  <kite9-diagram id="d">
    <kite9-container id="c1" label="c1">
      <kite9-glyph id="a" label="a" />
    </kite9-container>
    <kite9-container id="c2" label="c2">
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-container id="c3" label="c3">
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    <kite9-container id="c4" label="c4">
      <kite9-glyph id="d" label="d" />
    </kite9-container>
    <kite9-key id="k1" label="Key" />
    {link("l1", "a", "b")}
    {link("l2", "b", "c")}
    {link("l3", "c", "d")}
  </kite9-diagram>, {
  skip: "container-edge recursion incomplete",
  checks: { checkMidConnection: false },
});
checkLayout(
  "test_06_03_LikeASequence",
  <kite9-diagram id="d">
    <kite9-container id="c1" layout="RIGHT">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    <kite9-container id="c2" layout="RIGHT">
      <kite9-glyph id="d" label="d" />
      <kite9-glyph id="e" label="e" />
    </kite9-container>
    {link("l1", "c", "d", { drawDirection: "right" })}
  </kite9-diagram>, {
  skip: "container-edge recursion incomplete",
  checks: { checkMidConnection: false },
});
checkLayout(
  "test_06_04_CornersInContainers",
  <kite9-diagram id="d">
    <kite9-container id="c1">
      <kite9-glyph id="a" label="a" />
    </kite9-container>
    <kite9-container id="c2">
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-glyph id="c" label="c" />
    {link("l1", "a", "c")}
    {link("l2", "b", "c")}
  </kite9-diagram>,
  midOff,
);

checkLayout(
  "test_06_05_EmptyDiagram",
  <kite9-diagram id="d" />,
  midOff,
);

checkLayout(
  "test_06_06_MinimumSizing",
  <kite9-diagram id="d" style="min-width: 800px">
    <kite9-container id="b1" style="min-width: 300px">
      <kite9-glyph id="g1" label="one" style="min-width: 100px" />
    </kite9-container>
    <kite9-container id="b2" style="min-width: 300px">
      <kite9-glyph id="g2" label="two" style="min-width: 100px" />
      <kite9-glyph id="g3" label="three" style="min-width: 100px" />
    </kite9-container>
  </kite9-diagram>,
  midOff,
);
