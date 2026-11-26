/**
 * Grid occupies / cells.
 * old→new: Test56 (non-ignored subset) → test_11_1…test_11_8
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_11_01_GridWithSpanningSquares",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID" style="--kite9-grid-columns: 2; --kite9-grid-rows: 2">
      <kite9-container id="tl" style="--kite9-occupies: 0 0; min-width: 100px; min-height: 100px" />
      <kite9-container id="tr" style="--kite9-occupies: 1 0; min-width: 40px; min-height: 40px" />
      <kite9-container id="bl" style="--kite9-occupies: 0 1; min-width: 40px; min-height: 40px" />
      <kite9-container id="br" style="--kite9-occupies: 1 1; min-width: 40px; min-height: 40px" />
    </kite9-container>
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_02_GridWithDirectedConnections",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 2; --kite9-grid-rows: 2">
      <kite9-glyph id="one" label="one" style="--kite9-occupies: 0 0" />
      <kite9-glyph id="two" label="two" style="--kite9-occupies: 1 0" />
      <kite9-glyph id="three" label="three" style="--kite9-occupies: 0 1" />
      <kite9-glyph id="four" label="four" style="--kite9-occupies: 1 1" />
    </kite9-container>
    {link("l1", "two", "one", { drawDirection: "left", toDecoration: "DIAMOND" })}
    {link("l2", "three", "one", {
      drawDirection: "up",
      fromDecoration: "CIRCLE",
      toDecoration: "CIRCLE",
    })}
    {link("l3", "four", "one", { drawDirection: "left", fromDecoration: "ARROW" })}
    {link("l4", "two", "four", { drawDirection: "down" })}
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_03_TwoByTwo",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 2; --kite9-grid-rows: 2">
      <kite9-glyph id="a" label="a" style="--kite9-occupies: 0 0" />
      <kite9-glyph id="b" label="b" style="--kite9-occupies: 1 0" />
      <kite9-glyph id="c" label="c" style="--kite9-occupies: 0 1" />
      <kite9-glyph id="d" label="d" style="--kite9-occupies: 1 1" />
    </kite9-container>
    {link("l1", "a", "b")}
    {link("l2", "a", "c")}
    {link("l3", "b", "d")}
    {link("l4", "c", "d")}
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_04_SingleColumnGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 1; --kite9-grid-rows: 3">
      <kite9-glyph id="a" label="a" style="--kite9-occupies: 0 0" />
      <kite9-glyph id="b" label="b" style="--kite9-occupies: 0 1" />
      <kite9-glyph id="c" label="c" style="--kite9-occupies: 0 2" />
    </kite9-container>
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_05_SparseGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 3; --kite9-grid-rows: 3">
      <kite9-glyph id="a" label="a" style="--kite9-occupies: 0 0" />
      <kite9-glyph id="b" label="b" style="--kite9-occupies: 2 2" />
    </kite9-container>
    <kite9-glyph id="out" label="out" />
    {link("l1", "a", "out")}
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_06_CrazyOrdinals",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 5; --kite9-grid-rows: 5">
      <kite9-glyph id="a" label="a" style="--kite9-occupies: 0 0" />
      <kite9-glyph id="b" label="b" style="--kite9-occupies: 4 1" />
      <kite9-glyph id="c" label="c" style="--kite9-occupies: 2 4" />
    </kite9-container>
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_07_MissingOrdinals",
  <kite9-diagram id="diagram">
    <kite9-container id="grid" layout="GRID" style="--kite9-grid-columns: 3">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
      <kite9-glyph id="c" label="c" />
    </kite9-container>
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
checkLayout(
  "test_11_08_ConcentricGrids",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID" style="--kite9-grid-columns: 2; --kite9-grid-rows: 2">
      <kite9-container
        id="inner"
        layout="GRID"
        style="--kite9-occupies: 0 0; --kite9-grid-columns: 2; --kite9-grid-rows: 2"
      >
        <kite9-glyph id="a" label="a" style="--kite9-occupies: 0 0" />
        <kite9-glyph id="b" label="b" style="--kite9-occupies: 1 1" />
      </kite9-container>
      <kite9-glyph id="c" label="c" style="--kite9-occupies: 1 0" />
    </kite9-container>
    <kite9-glyph id="out" label="out" />
    {link("l1", "a", "out")}
  </kite9-diagram>,
  { skip: "GridPositioner incomplete" },
);
