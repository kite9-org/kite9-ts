/**
 * Links to and from containers (labelled ends, directed, crossing).
 * old→new: Java Test15 (ContainerLinking) → test_26_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_26_01_LabelledContainerLinks",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c1">
      <kite9-glyph id="g1" label="g1" />
    </kite9-container>
    <kite9-container id="con5" label={"c\n5"} />
    <kite9-container id="con4" label="c4" />
    <kite9-container id="con3" label="c3">
      <kite9-arrow id="a1" label="a1" />
    </kite9-container>
    <kite9-container id="con2" label="c2" />
    {link("l1", "con1", "con2", {
      fromLabel: "arranges",
      toDecoration: "ARROW",
      toLabel: "meets",
    })}
    {link("l2", "g1", "a1", { fromLabel: "g1end", toLabel: "aend" })}
  </kite9-diagram>,
);

checkLayout(
  "test_26_02_LinkedToThree",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c1" />
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    {link("l1", "con1", "g1", {
      fromLabel: "arranges 1",
      toDecoration: "ARROW",
      toLabel: "meets 1 ",
    })}
    {link("l2", "con1", "g2", {
      fromDecoration: "ARROW",
      fromLabel: "arranges 2",
      toDecoration: "ARROW",
      toLabel: "meets 2",
    })}
    {link("l3", "con1", "g3", {
      fromLabel: "arranges 3",
      toDecoration: "ARROW",
      toLabel: "meets 3",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_26_03_LinkedLeft",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c1" />
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    {link("l1", "con1", "g1", {
      fromLabel: "arranges 1",
      toDecoration: "ARROW",
      toLabel: "meets 1",
      drawDirection: "right",
    })}
    {link("l2", "con1", "g2", {
      fromDecoration: "ARROW",
      fromLabel: "arranges 2",
      toLabel: "meets 2",
      drawDirection: "right",
    })}
    {link("l3", "con1", "g3", {
      fromLabel: "arranges 3",
      toDecoration: "ARROW",
      toLabel: "meets 3",
      drawDirection: "right",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_26_04_LinkedRight",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c1" />
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    {link("l1", "con1", "g1", {
      fromDecoration: "ARROW",
      fromLabel: "arranges 1",
      toDecoration: "ARROW",
      toLabel: "meets 1",
      drawDirection: "left",
    })}
    {link("l2", "con1", "g2", {
      fromLabel: "arranges 2",
      toLabel: "meets 2",
      drawDirection: "left",
    })}
    {link("l3", "con1", "g3", {
      fromLabel: "arranges 3",
      toDecoration: "ARROW",
      toLabel: "meets 3",
      drawDirection: "left",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_26_05_CrossingLink",
  <kite9-diagram id="D">
    <kite9-container id="con2" label="c2">
      <kite9-container id="con1" label="c1" />
    </kite9-container>
    <kite9-glyph id="g1" label="g1" />
    {link("l1", "con1", "g1", {
      fromDecoration: "ARROW",
      fromLabel: "arranges",
      toDecoration: "ARROW",
      toLabel: "meets",
    })}
  </kite9-diagram>,
);
