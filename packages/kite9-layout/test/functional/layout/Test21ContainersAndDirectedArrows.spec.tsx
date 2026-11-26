/**
 * Containers combined with directed arrows.
 * old→new: Java Test8 (ContainersAndDirectedArrows) → test_21_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_21_01_DirectedArrowOutsideToInside",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_21_02_DirectedArrowInsideContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
      <kite9-arrow id="links" label="links" />
    </kite9-container>
    <kite9-glyph id="two" label="two" />
    {link("l1", "links", "one", { drawDirection: "up", toDecoration: "ARROW" })}
    {link("l2", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_21_03_ArrowToMultipleElements",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
      <kite9-glyph id="two" label="two" />
      <kite9-glyph id="three" label="three" stereotype="three" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    {link("l1", "links", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "links", "two")}
    {link("l3", "links", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_21_04_ArrowToSingleContainer",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
      <kite9-glyph id="two" label="two" />
      <kite9-glyph id="three" label="three" stereotype="three" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    {link("l1", "links", "three")}
    {link("l2", "links", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l3", "links", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_21_05_ArrowToMultipleContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b2">
      <kite9-container id="b1">
        <kite9-glyph id="one" label="one" />
        <kite9-glyph id="two" label="two" />
      </kite9-container>
      <kite9-glyph id="three" label="three" />
    </kite9-container>
    <kite9-arrow id="links" label="links" />
    {link("l1", "links", "one", { drawDirection: "down", toDecoration: "ARROW" })}
    {link("l2", "links", "two")}
    {link("l3", "links", "three")}
  </kite9-diagram>,
);

// Java: @NotAddressed — link from container to glyph with INVISIBLE class.
checkLayout(
  "test_21_06_ContainerWithLayoutConnection",
  <kite9-diagram id="The Diagram">
    <kite9-container id="b1">
      <kite9-glyph id="one" label="one" />
    </kite9-container>
    <kite9-glyph id="two" label="two" />
    {link("l1", "b1", "two", { drawDirection: "down" })}
    {link("l2", "one", "two")}
  </kite9-diagram>,
  { skip: "Java @NotAddressed; container-to-glyph INVISIBLE layout link not ported" },
);

checkLayout(
  "test_21_07_ArrowToMultipleContainers",
  <kite9-diagram id="The Diagram">
    <kite9-glyph id="three" label="three" />
    <kite9-container id="b2-4">
      <kite9-container id="b2-3">
        <kite9-container id="b2">
          <kite9-container id="b1" layout="RIGHT">
            <kite9-glyph id="one" label="one" />
            <kite9-glyph id="two" label="two" />
          </kite9-container>
        </kite9-container>
      </kite9-container>
    </kite9-container>
    {link("l1", "three", "one", { drawDirection: "down", toDecoration: "ARROW" })}
  </kite9-diagram>,
);
