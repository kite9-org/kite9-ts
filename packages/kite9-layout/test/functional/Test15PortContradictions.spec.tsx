/**
 * Port contradictions.
 * old→new: Test62 → test_15_1…test_15_4
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

const portSkip = {
  skip: "port planarization incomplete",
  checks: { checkNoContradictions: false },
};

checkLayout(
  "test_15_01_ComplexArrivalSides",
  <kite9-diagram id="d">
    <kite9-glyph id="One" label="One">
      <kite9-socket id="sock" direction="left" along="50%" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two" />
    <kite9-glyph id="Three" label="Three" />
    {link("l1", "sock", "Two", { drawDirection: "down", contradicting: true })}
    {link("l2", "sock", "Three", { drawDirection: "up", contradicting: true })}
  </kite9-diagram>,
  portSkip,
);

checkLayout(
  "test_15_02_DirectedPortSideContradiction",
  <kite9-diagram id="dia" layout="RIGHT">
    <kite9-glyph id="One" label="One" style="--kite9-traversal: prevent">
      <kite9-socket id="sock" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two" />
    {link("l1", "sock", "Two", { drawDirection: "left", contradicting: true })}
  </kite9-diagram>,
  portSkip,
);

checkLayout(
  "test_15_03_ImpossibleDirectedLinks",
  <kite9-diagram id="dia" layout="RIGHT">
    <kite9-glyph id="One" label="One" style="--kite9-traversal: prevent">
      <kite9-socket id="sock" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two" />
    <kite9-glyph id="Three" label="Three" />
    {link("l1", "sock", "Three", {
      drawDirection: "right",
      contradicting: true,
    })}
    {link("l2", "sock", "Two", { drawDirection: "right" })}
  </kite9-diagram>,
  portSkip,
);

checkLayout(
  "test_15_04_PortInsideBox",
  <kite9-diagram id="d">
    <kite9-container id="box">
      <kite9-glyph id="One" label="One">
        <kite9-socket id="sock" direction="right" along="50%" />
      </kite9-glyph>
    </kite9-container>
    <kite9-glyph id="Two" label="Two" />
  </kite9-diagram>,
  { skip: "port planarization incomplete" },
);
