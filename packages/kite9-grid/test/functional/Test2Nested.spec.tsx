/**
 * Nested layouts flattened into one GridLayout.
 */
import { checkLayout } from "./helpers.js";

checkLayout(
  "test_2_01_GridWithLeftChild",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(2, auto); grid-template-rows: repeat(2, auto)"
  >
    <kite9-container
      id="row"
      label=""
      layout="left"
      style="grid-column: 1 / 3; grid-row: 1"
    >
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-glyph id="bl" label="bl" style="grid-column: 1; grid-row: 2" />
    <kite9-glyph id="br" label="br" style="grid-column: 2; grid-row: 2" />
  </kite9-diagram>,
);

checkLayout(
  "test_2_02_DownInsideGrid",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(2, auto); grid-template-rows: auto"
  >
    <kite9-container
      id="stack"
      label=""
      layout="down"
      style="grid-column: 1; grid-row: 1"
    >
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-glyph id="side" label="side" style="grid-column: 2; grid-row: 1" />
  </kite9-diagram>,
);

checkLayout(
  "test_2_03_LeftInsideDown",
  <kite9-diagram id="diagram" layout="down">
    <kite9-container id="row" label="" layout="left">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-glyph id="c" label="c" />
  </kite9-diagram>,
);

/**
 * Three layout levels: diagram GRID → outer DOWN → inner LEFT → glyphs.
 * Flatten must subdivide through every level (not stop at one nest).
 */
checkLayout(
  "test_2_04_ThreeLevelNest",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(2, auto); grid-template-rows: repeat(2, auto)"
  >
    <kite9-container
      id="outer"
      label=""
      layout="down"
      style="grid-column: 1 / 3; grid-row: 1"
    >
      <kite9-container id="inner" label="" layout="left">
        <kite9-glyph id="a" label="a" />
        <kite9-glyph id="b" label="b" />
      </kite9-container>
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    <kite9-glyph id="bl" label="bl" style="grid-column: 1; grid-row: 2" />
    <kite9-glyph id="br" label="br" style="grid-column: 2; grid-row: 2" />
  </kite9-diagram>,
);

/** Glyph → container → container — padding chrome at each nest level. */
checkLayout(
  "test_2_05_SingleInDoubleNest",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" label="" layout="down">
      <kite9-container id="inner" label="" layout="down">
        <kite9-glyph id="a" label="a" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);
