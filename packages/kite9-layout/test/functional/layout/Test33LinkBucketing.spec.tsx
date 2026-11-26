/**
 * Many links fanning out of one arrow body inside a horizontal container.
 * old→new: Java Test23 (LinkBucketing) → test_33_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/** Java `setUp()` + `renderDiagram()`: `one` is an arrow body, the rest glyphs. */
function bucketing(links: ComponentChild[]): ComponentChild {
  return (
    <kite9-diagram id="The Diagram">
      <kite9-container id="b1" layout="RIGHT" label="inside">
        <kite9-arrow id="a1" label="a1" />
        <kite9-glyph id="g2" label="two" />
        <kite9-glyph id="g3" label="three" />
        <kite9-glyph id="g4" label="four" />
        <kite9-glyph id="g5" label="five" />
        <kite9-glyph id="g6" label="six" />
        <kite9-glyph id="g7" label="seven" />
      </kite9-container>
      {links}
    </kite9-diagram>
  );
}

checkLayout(
  "test_33_01_ConnectingToOne",
  bucketing([
    link("l1", "a1", "g2"),
    link("l2", "a1", "g3"),
    link("l3", "a1", "g4"),
    link("l4", "a1", "g5"),
    link("l5", "a1", "g6"),
    link("l6", "a1", "g7"),
  ]),
);

checkLayout(
  "test_33_02_SomeArrowHeads",
  bucketing([
    link("l1", "a1", "g2", { fromDecoration: "ARROW" }),
    link("l2", "a1", "g3"),
    link("l3", "a1", "g4"),
    link("l4", "a1", "g5", { fromDecoration: "ARROW" }),
    link("l5", "a1", "g6"),
    link("l6", "a1", "g7"),
  ]),
);

checkLayout(
  "test_33_03_AwkwardCuss",
  bucketing([
    link("l1", "a1", "g2", { fromDecoration: "ARROW" }),
    link("l2", "a1", "g3", { drawDirection: "right" }),
    link("l3", "a1", "g4"),
    link("l4", "a1", "g5", { fromDecoration: "ARROW" }),
    link("l5", "a1", "g6"),
    link("l6", "a1", "g7"),
  ]),
);
