/**
 * Layout balancing / slack optimisation.
 * old→new: Test44Balancing → test_44_01…test_44_06
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Java `checkMidConnections()` → false. */
const opts = { checks: { checkMidConnection: false } };

const KEY_TEXT = "this is a very long piece of text";

checkLayout(
  "test_44_01_SingleGlyph",
  <kite9-diagram id="d">
    <kite9-glyph id="a" label="a" />
    <kite9-key id="key" label={KEY_TEXT} />
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_44_02_UnjoinedGlyphs",
  <kite9-diagram id="d" layout="RIGHT">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-key id="key" label={KEY_TEXT} />
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_44_03_JoinedGlyphs",
  <kite9-diagram id="d" layout="RIGHT">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-key id="key" label={KEY_TEXT} />
    {link("l1", "a", "b")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_44_04_SimpleV",
  <kite9-diagram id="d">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
    <kite9-key id="key" label={KEY_TEXT} />
    {link("l1", "a", "b", { drawDirection: "right" })}
    {link("l2", "a", "c", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_44_05_Optimisable",
  <kite9-diagram id="d">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b1" label="b1" />
    <kite9-glyph id="b2" label="b2" />
    <kite9-glyph id="c" label="c" />
    <kite9-glyph id="long" label="very long glyph to keep everything separate" />
    {link("l1", "a", "b1", { drawDirection: "right" })}
    {link("l2", "a", "b2", { drawDirection: "right" })}
    {link("l3", "b1", "b2", { drawDirection: "right" })}
    {/* 2 links from b2 to c - should optimise to reduce that. */}
    {link("l4", "b1", "c", { drawDirection: "right" })}
    {link("l5", "b2", "c", { drawDirection: "right" })}
    {link("l6", "b2", "c", { drawDirection: "right" })}
    {link("l7", "a", "long", { drawDirection: "right" })}
    {link("l8", "long", "c", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_44_06_SharableSlack",
  <kite9-diagram id="dia">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b1" label="b1" />
    <kite9-glyph id="b2" label="b2" />
    <kite9-glyph id="c1" label="c1" />
    <kite9-glyph id="c2" label="c2" />
    <kite9-glyph id="c3" label="c3" />
    <kite9-glyph id="d" label="d" />
    <kite9-glyph id="long" label="very long glyph to keep everything separate" />
    {link("l1", "a", "b1", { drawDirection: "right" })}
    {link("l2", "b1", "b2", { drawDirection: "right" })}
    {link("l3", "b2", "d", { drawDirection: "right" })}
    {link("l4", "a", "c1", { drawDirection: "right" })}
    {link("l5", "c1", "c2", { drawDirection: "right" })}
    {link("l6", "c2", "c3", { drawDirection: "right" })}
    {link("l7", "c3", "d", { drawDirection: "right" })}
    {link("l8", "a", "long", { drawDirection: "right" })}
    {link("l9", "long", "d", { drawDirection: "right" })}
  </kite9-diagram>,
  opts,
);
