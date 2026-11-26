/**
 * Rectangularization: links on same/different sides of a container, tall/wide arrows.
 * old→new: Test19Rectangularization → test_19_01…test_19_06
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_19_01_LinksOnDifferentSides",
  <kite9-diagram id="blah">
    <kite9-container id="inner">
      <kite9-glyph id="A" label="A" />
      <kite9-glyph id="B" label="B" />
      <kite9-glyph id="C" label="C" />
      <kite9-glyph id="D" label="D" />
    </kite9-container>
    <kite9-arrow id="a1" label="a1" />
    <kite9-arrow id="b1" label="b1" />
    <kite9-arrow id="c1" label="c1" />
    <kite9-arrow id="d1" label="d1" />
    {link("l1", "A", "a1", { drawDirection: "up" })}
    {link("l2", "B", "b1", { drawDirection: "left" })}
    {link("l3", "C", "c1", { drawDirection: "right" })}
    {link("l4", "D", "d1", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_19_02_LinksOnSameSides",
  <kite9-diagram id="blah">
    <kite9-container id="inner">
      <kite9-glyph id="A" label="A" />
      <kite9-glyph id="B" label="B" />
      <kite9-glyph id="C" label="C" />
      <kite9-glyph id="D" label="D" />
    </kite9-container>
    <kite9-arrow id="a1" label="a1" />
    <kite9-arrow id="b1" label="b1" />
    <kite9-arrow id="c1" label="c1" />
    <kite9-arrow id="d1" label="d1" />
    {link("l1", "A", "a1", { drawDirection: "up" })}
    {link("l2", "B", "b1", { drawDirection: "down" })}
    {link("l3", "C", "c1", { drawDirection: "up" })}
    {link("l4", "D", "d1", { drawDirection: "down" })}
  </kite9-diagram>,
);

checkLayout(
  "test_19_03_UndirectedLinks",
  <kite9-diagram id="blah">
    <kite9-container id="inner">
      <kite9-glyph id="A" label="A" />
      <kite9-glyph id="B" label="B" />
      <kite9-glyph id="C" label="C" />
      <kite9-glyph id="D" label="D" />
    </kite9-container>
    <kite9-arrow id="a1" label="a1" />
    <kite9-arrow id="b1" label="b1" />
    <kite9-arrow id="c1" label="c1" />
    <kite9-arrow id="d1" label="d1" />
    {link("l1", "A", "a1")}
    {link("l2", "B", "b1")}
    {link("l3", "C", "c1")}
    {link("l4", "D", "d1")}
  </kite9-diagram>,
);

checkLayout(
  "test_19_04_TallArrow",
  <kite9-diagram id="blah">
    <kite9-container id="inner">
      <kite9-glyph id="A" label="A" />
      <kite9-glyph id="B" label="B" />
      <kite9-glyph id="C" label="C" />
      <kite9-glyph id="D" label="D" />
    </kite9-container>
    <kite9-arrow id="a1" label="a1" />
    {link("l1", "A", "a1", { drawDirection: "right" })}
    {link("l2", "B", "a1")}
    {link("l3", "C", "a1")}
    {link("l4", "D", "a1")}
  </kite9-diagram>,
);

checkLayout(
  "test_19_05_WideArrow",
  <kite9-diagram id="blah">
    <kite9-container id="inner">
      <kite9-glyph id="A" label="A" />
      <kite9-glyph id="B" label="B" />
      <kite9-glyph id="C" label="C" />
      <kite9-glyph id="D" label="D" />
    </kite9-container>
    <kite9-arrow id="a1" label="a1" />
    {link("l1", "A", "a1", { drawDirection: "up" })}
    {link("l2", "B", "a1")}
    {link("l3", "C", "a1")}
    {link("l4", "D", "a1")}
  </kite9-diagram>,
);

checkLayout(
  "test_19_06_WideAndTallArrow",
  <kite9-diagram id="blah">
    <kite9-glyph id="A" label="A" />
    <kite9-glyph id="B" label="B" />
    <kite9-glyph id="C" label="C" />
    <kite9-glyph id="D" label="D" />
    <kite9-arrow id="a1" label="a1" />
    {link("l1", "A", "a1", { drawDirection: "up" })}
    {link("l2", "B", "a1", { drawDirection: "up" })}
    {link("l3", "C", "a1", { drawDirection: "right" })}
    {link("l4", "D", "a1", { drawDirection: "right" })}
  </kite9-diagram>,
);
