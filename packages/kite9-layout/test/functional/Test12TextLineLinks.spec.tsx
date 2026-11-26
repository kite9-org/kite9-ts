/**
 * Text-line links (only suite using kite9-text-line).
 * old→new: Test57 → test_12_1…test_12_4
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

const checks = { checks: { checkMidConnection: false } };

checkLayout(
  "test_12_01_TextLineLink1",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One">
      <kite9-text-line id="linker" label="some row" />
    </kite9-glyph>
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "meets", "linker", { drawDirection: "right" })}
  </kite9-diagram>,
  checks,
);

checkLayout(
  "test_12_02_TextLineLink2",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="bigboy" label="One">
      <kite9-text-line id="linker" label="some row" />
      <kite9-text-line id="linker2" label="some other row" />
    </kite9-glyph>
    <kite9-arrow id="a" label="a" />
    <kite9-arrow id="b" label="b" />
    {link("l1", "a", "linker", { drawDirection: "right" })}
    {link("l2", "b", "linker2", { drawDirection: "left" })}
  </kite9-diagram>,
  checks,
);

checkLayout(
  "test_12_03_ExpandingArrow1",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One">
      <kite9-text-line id="linker" label="some row blah blah blah" />
    </kite9-glyph>
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="a" label="a" style="--kite9-sizing: maximize" />
    {link("l1", "a", "one", { drawDirection: "up" })}
    {link("l2", "one", "two", { drawDirection: "left" })}
  </kite9-diagram>,
  checks,
);

checkLayout(
  "test_12_04_ExpandingArrow2",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="one" label="One">
      <kite9-text-line id="linker" label="some row blah blah blah" />
    </kite9-glyph>
    <kite9-glyph id="two" label="Two" />
    <kite9-arrow id="a" label="a" style="--kite9-sizing: maximize" />
    {link("l1", "a", "linker", { drawDirection: "up" })}
    {link("l2", "one", "two", { drawDirection: "left" })}
  </kite9-diagram>,
  checks,
);
