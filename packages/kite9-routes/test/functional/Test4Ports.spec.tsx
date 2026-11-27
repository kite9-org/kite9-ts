/**
 * Socket/port terminals + links — from layout display Test14Ports,
 * converted to grid-supported directional layouts.
 */
import { checkLayout } from "./helpers.js";
import { link } from "./link.js";

checkLayout(
  "test_04_01_SimpleLinkToPort",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-glyph id="One" label="One">
      <kite9-socket id="port1" slot="port" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two">
      <kite9-socket id="port2" slot="port" direction="left" along="50%" />
    </kite9-glyph>
    {link("l1", "port1", "port2")}
  </kite9-diagram>,
);

checkLayout(
  "test_04_02_OffsetPorts",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-glyph id="a" label="a">
      <kite9-socket id="p1" slot="port" direction="right" along="20%" />
      <kite9-socket id="p2" slot="port" direction="right" along="80%" />
    </kite9-glyph>
    <kite9-container id="targets" layout="down">
      <kite9-glyph id="b" label="b" />
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    {link("l1", "p1", "b", { drawDirection: "right" })}
    {link("l2", "p2", "c", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_04_03_AlignmentAndPorts",
  <kite9-diagram id="The Diagram" layout="down">
    <kite9-container id="c1" layout="right">
      <kite9-glyph id="a" label="a">
        <kite9-socket id="pa" slot="port" direction="down" along="50%" />
      </kite9-glyph>
      <kite9-glyph id="b" label="b">
        <kite9-socket id="pb" slot="port" direction="down" along="50%" />
      </kite9-glyph>
    </kite9-container>
    <kite9-glyph id="c" label="c" />
    {link("l1", "pa", "c")}
    {link("l2", "pb", "c")}
  </kite9-diagram>,
);

checkLayout(
  "test_04_04_EvenFanFromPort",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-glyph id="hub" label="hub">
      <kite9-socket id="p" slot="port" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-container id="box" layout="down">
      <kite9-glyph id="t0" label="t0" />
      <kite9-glyph id="t1" label="t1" />
      <kite9-glyph id="t2" label="t2" />
      <kite9-glyph id="t3" label="t3" />
    </kite9-container>
    {link("l0", "p", "t0")}
    {link("l1", "p", "t1")}
    {link("l2", "p", "t2")}
    {link("l3", "p", "t3")}
  </kite9-diagram>,
);

checkLayout(
  "test_04_05_InAndOut",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-glyph id="left" label="left" />
    <kite9-glyph id="g" label="g">
      <kite9-socket id="in" slot="port" direction="left" along="50%" />
      <kite9-socket id="out" slot="port" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-glyph id="right" label="right" />
    {link("l1", "left", "in")}
    {link("l2", "out", "right")}
  </kite9-diagram>,
);

checkLayout(
  "test_04_06_MultipleLinksToPort",
  <kite9-diagram id="The Diagram" layout="right">
    <kite9-glyph id="One" label="One">
      <kite9-socket id="sock1" slot="port" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-container id="targets" layout="down">
      <kite9-glyph id="Two" label="Two" />
      <kite9-glyph id="Three" label="Three" />
    </kite9-container>
    {link("l1", "sock1", "Two")}
    {link("l2", "sock1", "Three")}
  </kite9-diagram>,
);
