/**
 * Orthogonalisation edge cases.
 * old→new: Test41OrthogonalisationEdgeCases (class-level @Ignore) → test_41_01
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_41_01_UnnecessaryBend",
  <kite9-diagram id="d" layout="DOWN">
    <kite9-glyph id="top" label="top" />
    <kite9-container id="middle" layout="HORIZONTAL">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    <kite9-glyph id="bottom" label="bottom" />
    {link("l1", "top", "a")}
    {link("l2", "top", "b")}
    {link("l3", "top", "c")}
    {link("l4", "bottom", "a")}
    {link("l5", "bottom", "b")}
  </kite9-diagram>,
  {
    skip: "Java class is @Ignore",
    checks: { everythingStraight: true },
  },
);
