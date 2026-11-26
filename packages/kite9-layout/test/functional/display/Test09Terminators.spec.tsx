/**
 * Terminator balance + style gallery.
 * old→new: Test39 (39_1–39_7, 39_9) → test_9_1…test_9_8
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

const STYLES = [
  "ARROW",
  "ARROW-OPEN",
  "CIRCLE",
  "GAP",
  "NONE",
  "DIAMOND",
  "DIAMOND-OPEN",
  "BARBED-ARROW",
] as const;

checkLayout(
  "test_09_01_BalancedTwo",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g1" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets")}
    {link("l2", "g2", "meets")}
  </kite9-diagram>,
);

checkLayout(
  "test_09_02_BalancedThree",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g1" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets")}
    {link("l2", "g2", "meets")}
    {link("l3", "g3", "meets")}
  </kite9-diagram>,
);

checkLayout(
  "test_09_03_BalancedFour",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g1" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets")}
    {link("l2", "g2", "meets")}
    {link("l3", "g3", "meets")}
    {link("l4", "g4", "meets")}
  </kite9-diagram>,
);

checkLayout(
  "test_09_04_BalancedFourWithArrowTerminator",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g1" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets")}
    {link("l2", "g2", "meets")}
    {link("l3", "g3", "meets")}
    {link("l4", "g4", "meets", { fromDecoration: "ARROW" })}
  </kite9-diagram>,
);

checkLayout(
  "test_09_05_BalancedFourWithRoundTerminator",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g1" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets")}
    {link("l2", "g2", "meets")}
    {link("l3", "g3", "meets")}
    {link("l4", "g4", "meets", { fromDecoration: "CIRCLE" })}
  </kite9-diagram>,
);

checkLayout(
  "test_09_06_BalancedFourWithTwoTerminators",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-arrow id="meets" label="meets" />
    {link("l1", "g1", "meets", { fromDecoration: "CIRCLE" })}
    {link("l2", "g2", "meets")}
    {link("l3", "g3", "meets", { fromDecoration: "CIRCLE" })}
    {link("l4", "g4", "meets")}
  </kite9-diagram>,
);

checkLayout(
  "test_09_07_TerminatorsBasic",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-container id="c1" label="c1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-container id="c2" label="c2" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-container id="c3" label="c3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-container id="c4" label="c4" />
    {link("l1", "g1", "c1", {
      drawDirection: "right",
      fromDecoration: "CIRCLE",
      toDecoration: "CIRCLE",
    })}
    {link("l2", "g2", "c2", {
      drawDirection: "right",
      fromDecoration: "ARROW",
      toDecoration: "ARROW",
    })}
    {link("l3", "g3", "c3", {
      drawDirection: "left",
      fromDecoration: "GAP",
      toDecoration: "GAP",
    })}
    {link("l4", "g4", "c4", {
      drawDirection: "left",
      fromDecoration: "NONE",
      toDecoration: "NONE",
    })}
  </kite9-diagram>,
);

checkLayout(
  "test_09_08_AllTheTerminators",
  <kite9-diagram id="d">
    {STYLES.flatMap((s, si) => {
      const a = `a${si}`;
      const b = `b${si}`;
      const c = `c${si}`;
      const d = `d${si}`;
      const e = `e${si}`;
      return [
        <kite9-glyph id={a} label="A" />,
        <kite9-glyph id={b} label="B" />,
        <kite9-glyph id={c} label="C" />,
        <kite9-glyph id={d} label="D" />,
        <kite9-glyph id={e} label="E" />,
        link(`${s}-r`, a, b, {
          drawDirection: "right",
          toDecoration: s,
        }),
        link(`${s}-l`, a, c, {
          drawDirection: "left",
          toDecoration: s,
        }),
        link(`${s}-d`, a, d, {
          drawDirection: "down",
          toDecoration: s,
        }),
        link(`${s}-u`, a, e, {
          drawDirection: "up",
          toDecoration: s,
        }),
      ];
    })}
  </kite9-diagram>,
  { checks: { checkOcclusion: false } },
);
