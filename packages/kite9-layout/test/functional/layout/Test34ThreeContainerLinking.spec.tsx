/**
 * Three containers inside a fourth, linked with various layout/link directions.
 * old→new: Java Test24 (ThreeContainerLinking) → test_34_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import type { Dir, Layout } from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

/** Java `testContainers(c1, c2, c3, l1, l2, c4)`. */
function threeContainers(
  c1?: Layout,
  c2?: Layout,
  c3?: Layout,
  l1?: Dir,
  l2?: Dir,
  c4?: Layout,
): ComponentChild {
  return (
    <kite9-diagram id="The Diagram">
      <kite9-container id="b4" layout={c4}>
        <kite9-container id="b1" layout={c1}>
          <kite9-glyph id="a" label="a" stereotype="Stereo" />
          <kite9-glyph id="b" label="b" stereotype="Stereo" />
          <kite9-glyph id="c" label="c" stereotype="Stereo" />
        </kite9-container>
        <kite9-container id="b2" layout={c2}>
          <kite9-glyph id="d" label="d" stereotype="Stereo" />
          <kite9-glyph id="e" label="e" stereotype="Stereo" />
          <kite9-glyph id="f" label="f" stereotype="Stereo" />
        </kite9-container>
        <kite9-container id="b3" layout={c3}>
          <kite9-glyph id="g" label="g" stereotype="Stereo" />
          <kite9-glyph id="h" label="h" stereotype="Stereo" />
          <kite9-glyph id="i" label="i" stereotype="Stereo" />
        </kite9-container>
      </kite9-container>
      {link("l1", "a", "h", { drawDirection: l1 })}
      {link("l2", "b", "i", { drawDirection: l2 })}
    </kite9-diagram>
  );
}

checkLayout("test_34_01_NoOrdering", threeContainers());

checkLayout(
  "test_34_02_LinkedHorizontally",
  threeContainers("RIGHT", "RIGHT", "RIGHT"),
);

checkLayout(
  "test_34_03_LinkedDifferentDirection",
  threeContainers("LEFT", "LEFT", "UP"),
);

checkLayout(
  "test_34_04_DirectedArrows",
  threeContainers(undefined, undefined, undefined, "up", "up"),
);

checkLayout(
  "test_34_05_AllDirected",
  threeContainers("RIGHT", "RIGHT", "RIGHT", "up", "up"),
);

checkLayout(
  "test_34_06_HorizontalDirection",
  threeContainers("HORIZONTAL", "HORIZONTAL", "HORIZONTAL"),
);

checkLayout(
  "test_34_07_VerticalDirection",
  threeContainers("VERTICAL", "VERTICAL", "VERTICAL"),
);

checkLayout(
  "test_34_08_MixedPlanarDirection",
  threeContainers("VERTICAL", "HORIZONTAL", "HORIZONTAL"),
);

checkLayout(
  "test_34_09_HorizontalDirection",
  threeContainers("RIGHT", "RIGHT", "RIGHT", undefined, undefined, "DOWN"),
);

checkLayout(
  "test_34_10_VerticalDirection",
  threeContainers("UP", "UP", "UP", undefined, undefined, "RIGHT"),
);

checkLayout(
  "test_34_11_SameDirection",
  threeContainers("RIGHT", "RIGHT", "RIGHT", undefined, undefined, "RIGHT"),
);

checkLayout(
  "test_34_12_LinkedDifferentReverseDirection",
  threeContainers("RIGHT", "RIGHT", "DOWN"),
);
