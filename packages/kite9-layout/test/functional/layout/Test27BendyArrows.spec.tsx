/**
 * Arrows linking glyph pairs in a triangle (bends allowed).
 * old→new: Java Test16 (BendyArrows) → test_27_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_27_01_BendyArrows",
  <kite9-diagram id="bendy">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
    <kite9-arrow id="ab" label="ab" />
    <kite9-arrow id="ac" label="ac" />
    <kite9-arrow id="bc" label="bc" />
    {link("l1", "ab", "a")}
    {link("l2", "ab", "b")}
    {link("l3", "ac", "a")}
    {link("l4", "ac", "c")}
    {link("l5", "bc", "b")}
    {link("l6", "bc", "c")}
  </kite9-diagram>,
);
