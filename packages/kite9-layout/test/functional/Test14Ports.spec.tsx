/**
 * Ports + alignment.
 * old→new: Test61 (subset) → test_14_1…test_14_8
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

const checks = {
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
};

function sixPorts(prefix: string) {
  return (
    <>
      <kite9-socket id={`${prefix}-u1`} direction="up" along="10px" />
      <kite9-socket id={`${prefix}-u2`} direction="up" along="-10px" />
      <kite9-socket id={`${prefix}-d1`} direction="down" along="10%" />
      <kite9-socket id={`${prefix}-d2`} direction="down" along="90%" />
      <kite9-socket id={`${prefix}-l`} direction="left" along="50%" />
      <kite9-socket id={`${prefix}-r`} direction="right" along="50%" />
    </>
  );
}

checkLayout(
  "test_14_01_PortPlacement",
  <kite9-diagram id="d">
    <kite9-container id="i1" layout="DOWN">
      <kite9-glyph id="One" label="One">
        {sixPorts("g")}
      </kite9-glyph>
      {sixPorts("c")}
    </kite9-container>
  </kite9-diagram>,
  checks,
);

checkLayout(
  "test_14_02_SimpleLinkToPort",
  <kite9-diagram id="dia" layout="DOWN">
    <kite9-glyph id="One" label="One">
      <kite9-socket id="port1" direction="right" along="130px" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two">
      <kite9-socket id="port2" direction="left" along="10px" />
    </kite9-glyph>
    {link("l1", "port1", "port2")}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_03_MultipleUndirectedLinksToPortLabelled",
  <kite9-diagram id="d">
    <kite9-glyph id="One" label="One">
      <kite9-socket id="sock1" direction="right" along="30px" />
    </kite9-glyph>
    <kite9-glyph id="Two" label="Two" />
    <kite9-glyph id="Three" label="Three" />
    {link("l1", "sock1", "Two", { fromLabel: "from end 2", toLabel: "to end 2" })}
    {link("l2", "sock1", "Three", { fromLabel: "from end", toLabel: "to end" })}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_04_EvenFanFromPort",
  <kite9-diagram id="d">
    <kite9-glyph id="hub" label="hub">
      <kite9-socket id="p" direction="right" along="50%" />
    </kite9-glyph>
    <kite9-container id="box">
      {Array.from({ length: 4 }, (_, i) => (
        <kite9-glyph id={`t${i}`} label={`t${i}`} />
      ))}
    </kite9-container>
    {Array.from({ length: 4 }, (_, i) => link(`l${i}`, "p", `t${i}`))}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_05_DirectedWithPorts",
  <kite9-diagram id="d">
    <kite9-container id="c1">
      <kite9-socket id="cp" direction="right" along="50%" />
    </kite9-container>
    <kite9-glyph id="g1" label="g1" />
    {link("l1", "cp", "g1", { drawDirection: "right" })}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_06_AlignmentAndPorts",
  <kite9-diagram id="d">
    <kite9-container id="c1" layout="RIGHT" style="min-width: 300px">
      <kite9-glyph id="a" label="a">
        <kite9-socket id="pa" direction="down" along="50%" />
      </kite9-glyph>
      <kite9-glyph id="b" label="b">
        <kite9-socket id="pb" direction="down" along="50%" />
      </kite9-glyph>
    </kite9-container>
    <kite9-glyph id="c" label="c" />
    {link("l1", "pa", "c")}
    {link("l2", "pb", "c")}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_07_OffsetPortsAndMiddles",
  <kite9-diagram id="d">
    <kite9-glyph id="a" label="a">
      <kite9-socket id="p1" direction="right" along="20%" />
      <kite9-socket id="p2" direction="right" along="80%" />
    </kite9-glyph>
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
    {link("l1", "p1", "b", { drawDirection: "right" })}
    {link("l2", "p2", "c", { drawDirection: "right" })}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
checkLayout(
  "test_14_08_InAndOut",
  <kite9-diagram id="d">
    <kite9-glyph id="g" label="g">
      <kite9-socket id="in" direction="left" along="50%" />
      <kite9-socket id="out" direction="right" along="50%" />
    </kite9-glyph>
    {link("loop", "out", "in")}
  </kite9-diagram>, {
  skip: "port planarization incomplete",
  checks: {
    everythingStraight: false,
    checkEdgeDirections: false,
    checkMidConnection: false,
  },
});
