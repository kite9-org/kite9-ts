/**
 * Labelled fan.
 * old→new: Test64 → test_10_1…test_10_4
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

function fanChain(n: number) {
  const glyphs = Array.from({ length: n }, (_, i) => (
    <kite9-glyph id={`fan-${i}`} label={`f${i}`} />
  ));
  const spokes = Array.from({ length: n }, (_, i) =>
    link(`s${i}`, "g1", `fan-${i}`, {
      drawDirection: "down",
      fromLabel: `from-${i}`,
      toLabel: `to-${i}`,
    }),
  );
  const chain = Array.from({ length: n - 1 }, (_, i) =>
    link(`c${i}`, `fan-${i}`, `fan-${i + 1}`, { drawDirection: "right" }),
  );
  return { glyphs, spokes, chain };
}

checkLayout(
  "test_10_01_DownFanFixedMiddlesLabels",
  (() => {
    const { glyphs, spokes, chain } = fanChain(8);
    return (
      <kite9-diagram id="d">
        <kite9-glyph id="g0" label="g0" />
        <kite9-glyph id="g1" label="g1" />
        {glyphs}
        {link("stem", "g0", "g1", { drawDirection: "down" })}
        {spokes}
        {chain}
      </kite9-diagram>
    );
  })(),
  { checks: { checkOcclusion: false } },
);

checkLayout(
  "test_10_02_LargeGlyphLabelled",
  (() => {
    const { glyphs, spokes, chain } = fanChain(8);
    return (
      <kite9-diagram id="d">
        <kite9-glyph id="g0" label="g0" />
        <kite9-glyph id="g1" label="g1" style="width: 200px" />
        {glyphs}
        {link("stem", "g0", "g1", { drawDirection: "down" })}
        {spokes}
        {chain}
      </kite9-diagram>
    );
  })(),
  { checks: { checkOcclusion: false } },
);

checkLayout(
  "test_10_03_DoubleFanningLabelled",
  <kite9-diagram id="d">
    <kite9-glyph id="h1" label="h1" />
    <kite9-glyph id="h2" label="h2" />
    {Array.from({ length: 4 }, (_, i) => (
      <kite9-glyph id={`t${i}`} label={`t${i}`} />
    ))}
    {Array.from({ length: 4 }, (_, i) =>
      link(`a${i}`, "h1", `t${i}`, {
        fromLabel: `a${i}`,
        toLabel: `ta${i}`,
      }),
    )}
    {Array.from({ length: 4 }, (_, i) =>
      link(`b${i}`, "h2", `t${i}`, {
        fromLabel: `b${i}`,
        toLabel: `tb${i}`,
      }),
    )}
  </kite9-diagram>,
  { checks: { checkOcclusion: false } },
);

checkLayout(
  "test_10_04_DifferentDirectionFanning",
  <kite9-diagram id="d">
    <kite9-glyph id="downHub" label="down" />
    <kite9-glyph id="rightHub" label="right" />
    {Array.from({ length: 4 }, (_, i) => (
      <kite9-glyph id={`t${i}`} label={`t${i}`} />
    ))}
    {Array.from({ length: 4 }, (_, i) =>
      link(`d${i}`, "downHub", `t${i}`, {
        drawDirection: "down",
        fromLabel: `d${i}`,
      }),
    )}
    {Array.from({ length: 4 }, (_, i) =>
      link(`r${i}`, "rightHub", `t${i}`, {
        drawDirection: "right",
        fromLabel: `r${i}`,
      }),
    )}
  </kite9-diagram>,
  { checks: { checkOcclusion: false } },
);
