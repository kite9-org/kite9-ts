/**
 * Two containers inside a third, linked with various layout/link directions.
 * old→new: Java Test17 (TwoContainerLinking) → test_28_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

type Layout = "UP" | "DOWN" | "LEFT" | "RIGHT" | "HORIZONTAL" | "VERTICAL";
type Dir = "up" | "down" | "left" | "right";

/** Java `testContainers(c1, c2, l1, l2, c3)`. */
function twoContainers(
  c1?: Layout,
  c2?: Layout,
  l1?: Dir,
  l2?: Dir,
  c3?: Layout,
): ComponentChild {
  return (
    <kite9-diagram id="The Diagram">
      <kite9-container id="b3" layout={c3}>
        <kite9-container id="b1" layout={c1}>
          <kite9-glyph id="a" label="a" />
          <kite9-glyph id="b" label="b" />
          <kite9-glyph id="c" label="c" />
        </kite9-container>
        <kite9-container id="b2" layout={c2}>
          <kite9-glyph id="d" label="d" />
          <kite9-glyph id="e" label="e" />
          <kite9-glyph id="f" label="f" />
        </kite9-container>
      </kite9-container>
      {link("l1", "a", "d", { drawDirection: l1 })}
      {link("l2", "b", "e", { drawDirection: l2 })}
    </kite9-diagram>
  );
}

checkLayout("test_28_01_NoOrdering", twoContainers());

checkLayout(
  "test_28_02_LinkedHorizontally",
  twoContainers("RIGHT", "RIGHT"),
);

checkLayout(
  "test_28_03_LinkedDifferentDirection",
  twoContainers("LEFT", "UP"),
);

checkLayout(
  "test_28_04_DirectedArrows",
  twoContainers(undefined, undefined, "up", "up"),
);

checkLayout(
  "test_28_05_AllDirected",
  twoContainers("RIGHT", "RIGHT", "up", "up"),
);

checkLayout(
  "test_28_06_HorizontalDirection",
  twoContainers("HORIZONTAL", "HORIZONTAL"),
);

checkLayout(
  "test_28_07_VerticalDirection",
  twoContainers("VERTICAL", "VERTICAL"),
);

checkLayout(
  "test_28_08_MixedPlanarDirection",
  twoContainers("VERTICAL", "HORIZONTAL"),
);

checkLayout(
  "test_28_09_HorizontalDirection",
  twoContainers("RIGHT", "RIGHT", undefined, undefined, "DOWN"),
);

checkLayout(
  "test_28_10_VerticalDirection",
  twoContainers("UP", "UP", undefined, undefined, "RIGHT"),
);

checkLayout(
  "test_28_11_SameDirection",
  twoContainers("RIGHT", "RIGHT", undefined, undefined, "RIGHT"),
);

checkLayout(
  "test_28_12_LinkedDifferentDirection",
  <kite9-diagram id="d">
    <kite9-container id="outer" layout="RIGHT">
      <kite9-container id="i1" layout="DOWN" />
      <kite9-container id="i2" layout="DOWN" />
      <kite9-container id="i3" layout="DOWN" />
      <kite9-container id="i4" layout="DOWN" />
    </kite9-container>
  </kite9-diagram>,
);
