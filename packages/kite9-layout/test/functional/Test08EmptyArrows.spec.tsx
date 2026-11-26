/**
 * Empty / point arrows (link-body hubs).
 * old→new: Test34 (34_1–34_6; skip 34_7 exception) → test_8_1…test_8_6
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

checkLayout(
  "test_08_01_3WayPointArrow",
  <kite9-diagram id="d">
    <kite9-arrow id="a" />
    <kite9-glyph id="g1" label="The 1" />
    <kite9-glyph id="g2" label="The 2" />
    <kite9-glyph id="g3" label="The 3" />
    {link("a-1", "a", "g1")}
    {link("a-2", "a", "g2")}
    {link("a-3", "a", "g3")}
  </kite9-diagram>,
);

checkLayout(
  "test_08_02_4WayPointArrow",
  <kite9-diagram id="d">
    <kite9-arrow id="a" label="a" />
    <kite9-glyph id="ga" label="The a" />
    <kite9-glyph id="gb" label="The b" />
    <kite9-glyph id="gc" label="The c" />
    <kite9-glyph id="gd" label="The d" />
    {link("l1", "a", "ga")}
    {link("l2", "a", "gb")}
    {link("l3", "a", "gc")}
    {link("l4", "a", "gd")}
  </kite9-diagram>,
);

checkLayout(
  "test_08_03_5WayPointArrow",
  <kite9-diagram id="d">
    <kite9-arrow id="middle" />
    <kite9-glyph id="ga" label="The a" />
    <kite9-glyph id="gb" label="The b" />
    <kite9-glyph id="gc" label="The c" />
    <kite9-glyph id="gd" label="The d" />
    <kite9-glyph id="ge" label="The e" />
    {link("l1", "middle", "ga")}
    {link("l2", "middle", "gb")}
    {link("l3", "middle", "gc")}
    {link("l4", "middle", "gd")}
    {link("l5", "middle", "ge")}
  </kite9-diagram>,
);

checkLayout(
  "test_08_04_3WayNonPointArrow",
  <kite9-diagram id="d">
    <kite9-arrow id="middle" label="middle" />
    <kite9-glyph id="ga" label="The a" />
    <kite9-glyph id="gb" label="The b" />
    <kite9-glyph id="gc" label="The c" />
    {link("l1", "middle", "gb")}
    {link("l2", "middle", "ga", { drawDirection: "right" })}
    {link("l3", "middle", "gc", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_08_05_3WayPointArrowWithBuffers",
  <kite9-diagram id="d">
    <kite9-arrow id="a" />
    <kite9-glyph id="ga" label="The a" />
    <kite9-glyph id="gb" label="The b" />
    <kite9-glyph id="gc" label="The c" />
    {link("l1", "a", "ga")}
    {link("l2", "a", "gb")}
    {link("l3", "a", "gc")}
  </kite9-diagram>,
);

checkLayout(
  "test_08_06_3WayPointArrowWithTerms",
  <kite9-diagram id="d">
    <kite9-arrow id="a" />
    <kite9-glyph id="ga" label="The a" />
    <kite9-glyph id="gb" label="The b" />
    <kite9-glyph id="gc" label="The c" />
    {link("l1", "a", "gb", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l2", "a", "ga", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l3", "a", "gc", { toDecoration: "ARROW" })}
  </kite9-diagram>,
);
