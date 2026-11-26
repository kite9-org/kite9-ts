/**
 * Containers combined with arrow hubs.
 * old→new: Java Test6 (ContainersAndArrows) → test_31_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_31_01_ArrowOutsideContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one", { drawDirection: "up" })}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_31_02_ArrowInsideContainerFinal",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
      <kite9-arrow id="links" label="links" />
    </kite9-container>
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one")}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_31_03_ArrowToMultipleElements",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
      <kite9-glyph id="two" label="two" />
      <kite9-glyph id="three" label="three" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    {link("l1", "links", "one")}
    {link("l2", "links", "two")}
    {link("l3", "links", "three")}
  </kite9-diagram>,
);
