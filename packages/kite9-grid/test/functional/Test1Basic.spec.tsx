/**
 * Flat directional layouts + spanning CSS grid cells.
 */
import { checkLayout } from "./helpers.js";

checkLayout(
  "test_1_01_Right",
  <kite9-diagram id="diagram" layout="right">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_02_Left",
  <kite9-diagram id="diagram" layout="left">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_03_Down",
  <kite9-diagram id="diagram" layout="down">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_04_Up",
  <kite9-diagram id="diagram" layout="up">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_05_GridTwoByTwo",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(2, auto); grid-template-rows: repeat(2, auto)"
  >
    <kite9-glyph id="tl" label="tl" style="grid-column: 1; grid-row: 1" />
    <kite9-glyph id="tr" label="tr" style="grid-column: 2; grid-row: 1" />
    <kite9-glyph id="bl" label="bl" style="grid-column: 1; grid-row: 2" />
    <kite9-glyph id="br" label="br" style="grid-column: 2; grid-row: 2" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_06_GridColumnSpan",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(3, auto); grid-template-rows: repeat(2, auto)"
  >
    <kite9-glyph id="top" label="top" style="grid-column: 1 / 4; grid-row: 1" />
    <kite9-glyph id="bl" label="bl" style="grid-column: 1; grid-row: 2" />
    <kite9-glyph id="br" label="br" style="grid-column: 3; grid-row: 2" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_07_GridRowSpan",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(2, auto); grid-template-rows: repeat(3, auto)"
  >
    <kite9-glyph id="side" label="side" style="grid-column: 1; grid-row: 1 / 4" />
    <kite9-glyph id="tr" label="tr" style="grid-column: 2; grid-row: 1" />
    <kite9-glyph id="br" label="br" style="grid-column: 2; grid-row: 3" />
  </kite9-diagram>,
);

checkLayout(
  "test_1_08_GridMixedSpans",
  <kite9-diagram
    id="diagram"
    layout="grid"
    style="grid-template-columns: repeat(3, auto); grid-template-rows: repeat(3, auto)"
  >
    <kite9-glyph
      id="a"
      label="a"
      style="grid-column: 1 / 3; grid-row: 1; justify-self: stretch; align-self: stretch"
    />
    <kite9-glyph
      id="b"
      label="b"
      style="grid-column: 3; grid-row: 1 / 3; justify-self: stretch; align-self: stretch"
    />
    <kite9-glyph
      id="c"
      label="c"
      style="grid-column: 1; grid-row: 2 / 4; justify-self: stretch; align-self: stretch"
    />
    <kite9-glyph
      id="d"
      label="d"
      style="grid-column: 2; grid-row: 3; justify-self: stretch; align-self: stretch"
    />
  </kite9-diagram>,
);


checkLayout(
  "test_1_09_Empty",
  <kite9-diagram id="diagram" />,
);

checkLayout(
  "test_1_10_SingleGlyph",
  <kite9-diagram id="diagram">
    <kite9-glyph id="a" label="a" />
  </kite9-diagram>,
);

