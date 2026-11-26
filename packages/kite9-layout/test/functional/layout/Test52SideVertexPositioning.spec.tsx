/**
 * Side vertex positioning: container ↔ container / vertex links around grids.
 * old→new: Test52SideVertexPositioning → test_52_01…test_52_04, test_52_06
 * (Java has no 52_5)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Java `checkEverythingStraight()` → false (the default). */
const opts = {};

/** Java `createSquareGridContext` inside a 2×2 grid container called "outer". */
function outerGrid(): ComponentChild {
  return (
    <kite9-container
      id="outer"
      layout="GRID"
      style="--kite9-grid-columns: 2; --kite9-grid-rows: 2"
    >
      <kite9-container id="tl" style="--kite9-occupies: 0 0">
        <kite9-glyph id="one" label="one" />
      </kite9-container>
      <kite9-container id="tr" style="--kite9-occupies: 1 0">
        <kite9-glyph id="two" label="two" />
      </kite9-container>
      <kite9-container id="bl" style="--kite9-occupies: 0 1">
        <kite9-glyph id="three" label="three" />
      </kite9-container>
      <kite9-container id="br" style="--kite9-occupies: 1 1">
        <kite9-glyph id="four" label="four" />
      </kite9-container>
    </kite9-container>
  );
}

checkLayout(
  "test_52_01_ContainerToContainerRight",
  <kite9-diagram id="diagram">
    {outerGrid()}
    <kite9-container id="five">
      <kite9-glyph id="six" label="six" />
    </kite9-container>
    {link("l1", "two", "six")}
    {link("l2", "outer", "five", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_52_02_ContainerToContainerDown",
  <kite9-diagram id="diagram">
    {outerGrid()}
    <kite9-container id="five">
      <kite9-glyph id="six" label="six" />
    </kite9-container>
    {link("l1", "two", "six")}
    {link("l2", "outer", "five", { drawDirection: "down" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_52_03_ContainerToVertexRight",
  <kite9-diagram id="d1">
    <kite9-container id="c1" layout="RIGHT">
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g4" label="g4" />
    </kite9-container>
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    {link("l1", "g1", "g2")}
    {link("l2", "g1", "g2")}
    {link("l3", "g1", "g3")}
    {link("l4", "g1", "g3")}
    {link("l5", "g1", "g4")}
    {link("l6", "g1", "g4")}
    {link("l7", "g1", "g5")}
    {link("l8", "c1", "g5", { drawDirection: "right" })}
    {link("l9", "g6", "g5", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_52_04_ContainerToVertexUp",
  <kite9-diagram id="d1">
    <kite9-container id="c1" layout="UP">
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g4" label="g4" />
    </kite9-container>
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    {link("l1", "g1", "g2")}
    {link("l2", "g1", "g2")}
    {link("l3", "g1", "g3")}
    {link("l4", "g1", "g3")}
    {link("l5", "g1", "g4")}
    {link("l6", "g1", "g4")}
    {link("l7", "g1", "g5")}
    {link("l8", "c1", "g5", { drawDirection: "up" })}
    {link("l9", "g6", "g5", { drawDirection: "up" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_52_06_ContainerToContainerDown2",
  <kite9-diagram id="diagram">
    {outerGrid()}
    <kite9-container id="five">
      <kite9-glyph id="six" label="six" />
    </kite9-container>
    <kite9-glyph id="seven" label="seven" />
    {link("l1", "two", "six")}
    {link("l2", "outer", "five", { drawDirection: "down" })}
    {link("l3", "four", "seven", { drawDirection: "down" })}
    {link("l4", "six", "seven", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);
