/**
 * Directed arrows spanning multiple faces / nested containers.
 * old→new: Java Test11 (MultiFaceDirectedArrows) → test_24_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_24_01_SeparatedLinks",
  <kite9-diagram id="The Diagram">
    <kite9-container id="if">
      <kite9-glyph id="inside" label="inside" />
      <kite9-arrow id="i1" label="i1" />
    </kite9-container>
    <kite9-glyph id="outside" label="outside" />
    <kite9-arrow id="o1" label="o1" />
    {link("l1", "inside", "i1", { drawDirection: "right" })}
    {link("l2", "outside", "o1", { drawDirection: "left" })}
    {link("l3", "inside", "outside")}
  </kite9-diagram>,
);

checkLayout(
  "test_24_02_SeparatedLinksMultipleContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="if 5">
      <kite9-container id="if 4">
        <kite9-container id="if 3">
          <kite9-container id="if 2">
            <kite9-container id="if 1">
              <kite9-glyph id="inside" label="inside" />
              <kite9-arrow id="i1" label="i1" />
            </kite9-container>
          </kite9-container>
        </kite9-container>
      </kite9-container>
    </kite9-container>
    <kite9-glyph id="outside" label="outside" />
    <kite9-arrow id="o1" label="o1" />
    {link("l1", "inside", "i1", { drawDirection: "right" })}
    {link("l2", "outside", "o1", { drawDirection: "left" })}
    {link("l3", "inside", "outside")}
  </kite9-diagram>,
);

checkLayout(
  "test_24_03_DirectedLinksMultipleContainers",
  <kite9-diagram id="The Diagram">
    <kite9-container id="if 4">
      <kite9-container id="if 3">
        <kite9-container id="if 2">
          <kite9-container id="if 1">
            <kite9-glyph id="inside" label="inside" />
            <kite9-arrow id="i1" label="i1" />
          </kite9-container>
        </kite9-container>
      </kite9-container>
    </kite9-container>
    <kite9-glyph id="outside" label="outside" />
    <kite9-arrow id="o1" label="o1" />
    {link("l1", "inside", "i1", { drawDirection: "right" })}
    {link("l2", "outside", "o1", { drawDirection: "left" })}
    {link("l3", "inside", "outside", { drawDirection: "up" })}
  </kite9-diagram>,
);
