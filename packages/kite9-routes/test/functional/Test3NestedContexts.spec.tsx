/**
 * Nested containers + links — from layout display Test03 / Test21,
 * converted to grid-supported directional layouts.
 */
import { checkLayout } from "./helpers.js";
import { link } from "./link.js";

checkLayout(
  "test_03_01_HierarchicalContainersWithLink",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b3" layout="right">
      <kite9-container id="b1" layout="right">
        <kite9-glyph id="g1" label="one" />
      </kite9-container>
      <kite9-container id="b2" layout="right">
        <kite9-glyph id="g2" label="two" />
      </kite9-container>
    </kite9-container>
    {link("l1", "g1", "g2")}
  </kite9-diagram>,
);

checkLayout(
  "test_03_02_TurnsInsideContainers",
  <kite9-diagram id="The Diagram" layout="down">
    <kite9-container id="row" layout="right">
      <kite9-container id="b1" layout="right">
        <kite9-glyph id="one" label="one" />
      </kite9-container>
      <kite9-container id="b2" layout="right">
        <kite9-glyph id="two" label="two" />
      </kite9-container>
    </kite9-container>
    <kite9-container id="bottom" layout="right">
      <kite9-glyph id="three" label="three" />
      <kite9-glyph id="four" label="four" />
      <kite9-glyph id="five" label="five" />
    </kite9-container>
    {link("l1", "one", "three", { drawDirection: "down" })}
    {link("l2", "two", "five", { drawDirection: "down" })}
    {link("l3", "three", "four", { drawDirection: "right" })}
    {link("l4", "four", "five", { drawDirection: "right" })}
    {link("tl1", "one", "four")}
    {link("tl2", "two", "four")}
  </kite9-diagram>,
);

checkLayout(
  "test_03_03_DirectedArrowOutsideToInside",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-container id="b1" layout="right">
      <kite9-glyph id="one" label="one" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one", {
      drawDirection: "left",
      toDecoration: "ARROW",
    })}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_03_04_DirectedArrowInsideContainer",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-container id="b1" layout="right">
      <kite9-glyph id="one" label="one" />
      <kite9-arrow id="links" label="links" />
    </kite9-container>
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one", {
      drawDirection: "left",
      toDecoration: "ARROW",
    })}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_03_05_NestedContainersArrowFan",
  <kite9-diagram id="The Diagram" layout="down">
    <kite9-arrow id="links" label="links" />
    <kite9-container id="b2" layout="right">
      <kite9-container id="b1" layout="right">
        <kite9-glyph id="one" label="one" />
        <kite9-glyph id="two" label="two" />
      </kite9-container>
      <kite9-glyph id="three" label="three" />
    </kite9-container>
    {link("l1", "links", "one", {
      drawDirection: "down",
      toDecoration: "ARROW",
    })}
    {link("l2", "links", "two")}
    {link("l3", "links", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_03_06_CrossingIntoNestedContainer",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-container id="con2" layout="right" label="c2">
      <kite9-container id="con1" layout="right" label="c1">
        <kite9-glyph id="inner" label="inner" />
      </kite9-container>
    </kite9-container>
    <kite9-glyph id="g1" label="g1" />
    {link("l1", "con1", "g1", { toDecoration: "ARROW" })}
  </kite9-diagram>,
);
