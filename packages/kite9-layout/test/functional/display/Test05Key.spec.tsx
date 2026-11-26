/**
 * Key as layout participant.
 * old→new: Test13 (13_6, 13_8–10, 13_17) → test_5_1…test_5_5
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_05_01_WithLotsOfWidth",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="wide glyph label here" />
    <kite9-arrow id="a1" label="wide arrow label" />
    <kite9-key id="k1" label="Key" />
    {link("l1", "g1", "a1", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_05_02_SeparateGlyphsWithKey",
  <kite9-diagram id="d">
    <kite9-glyph id="actor" label="Actor" />
    <kite9-glyph id="director" label="Director" />
    <kite9-key id="k1" label="Key" />
    {link("l1", "actor", "director")}
  </kite9-diagram>,
);

checkLayout(
  "test_05_03_WonkyContextLabel",
  <kite9-diagram id="d">
    <kite9-container id="film" label="Film">
      <kite9-glyph id="g1" label="Scene" />
    </kite9-container>
    <kite9-glyph id="g2" label="Extra" />
    {link("l1", "g1", "g2")}
  </kite9-diagram>,
);

checkLayout(
  "test_05_04_KeyInsideContext",
  <kite9-diagram id="d">
    <kite9-container id="c1">
      <kite9-glyph id="g1" label="g1" />
      <kite9-key id="k1" label="Key" />
    </kite9-container>
    <kite9-glyph id="g2" label="g2" />
    {link("l1", "g1", "g2")}
  </kite9-diagram>,
);

checkLayout(
  "test_05_05_LongContextLabelDownLink",
  <kite9-diagram id="d">
    <kite9-container id="c1" label="A fairly long context title">
      <kite9-glyph id="g1" label="g1" />
    </kite9-container>
    <kite9-glyph id="g2" label="g2" />
    {link("l1", "g1", "g2", { drawDirection: "down" })}
  </kite9-diagram>,
);
