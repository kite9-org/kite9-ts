/**
 * Fixed container size + fixed child sizes with CSS Grid cell alignment.
 */
import { checkLayout } from "./helpers.js";

checkLayout(
  "test_3_01_RightFixedWidthAlign",
  <kite9-diagram
    id="diagram"
    layout="right"
    style="min-width: 480px; min-height: 120px"
  >
    <kite9-glyph
      id="a"
      label="a"
      style="width: 60px; height: 40px; justify-self: start; align-self: start"
    />
    <kite9-glyph
      id="b"
      label="b"
      style="width: 60px; height: 40px; justify-self: center; align-self: center"
    />
    <kite9-glyph
      id="c"
      label="c"
      style="width: 60px; height: 40px; justify-self: end; align-self: end"
    />
  </kite9-diagram>,
);

checkLayout(
  "test_3_02_DownFixedHeightAlign",
  <kite9-diagram
    id="diagram"
    layout="down"
    style="min-width: 200px; min-height: 360px"
  >
    <kite9-glyph
      id="a"
      label="a"
      style="width: 80px; height: 40px; justify-self: start; align-self: start"
    />
    <kite9-glyph
      id="b"
      label="b"
      style="width: 80px; height: 40px; justify-self: center; align-self: center"
    />
    <kite9-glyph
      id="c"
      label="c"
      style="width: 80px; height: 40px; justify-self: end; align-self: end"
    />
  </kite9-diagram>,
);

checkLayout(
  "test_3_03_RightWideCells",
  <kite9-diagram
    id="diagram"
    layout="right"
    style="min-width: 400px; min-height: 100px"
  >
    <kite9-glyph
      id="leftish"
      label="L"
      style="width: 50px; height: 50px; justify-self: start; align-self: end"
    />
    <kite9-glyph
      id="rightish"
      label="R"
      style="width: 50px; height: 50px; justify-self: end; align-self: start"
    />
  </kite9-diagram>,
);
