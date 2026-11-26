/**
 * Fan layouts.
 * old→new: Test31 → test_7_1…test_7_8
 */
import { checkLayout } from "./helpers/check-layout.js";
import { link } from "./helpers/link.js";

checkLayout(
  "test_07_01_Basic2InABox",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="a" />
    <kite9-container id="c1">
      <kite9-glyph id="g2" label="another long label" />
      <kite9-glyph id="g3" label="g3" />
    </kite9-container>
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    <kite9-glyph id="g7" label="g7" />
    {link("l1", "g1", "g3")}
    {link("l2", "g1", "g2")}
    {link("l3", "g1", "g5", { drawDirection: "right" })}
    {link("l4", "g1", "g6", { drawDirection: "left" })}
    {link("l5", "g1", "g7", { drawDirection: "up" })}
  </kite9-diagram>,
);

checkLayout(
  "test_07_02_Basic3InABox",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="a" />
    <kite9-container id="c1">
      <kite9-glyph id="g2" label="label two" />
      <kite9-glyph id="g3" label="label three" />
      <kite9-glyph id="g4" label="label four" />
    </kite9-container>
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    {link("l1", "g1", "g5", { drawDirection: "right" })}
    {link("l2", "g1", "g6", { drawDirection: "left" })}
    {link("l3", "g1", "g2")}
    {link("l4", "g1", "g3")}
    {link("l5", "g1", "g4")}
  </kite9-diagram>,
);

checkLayout(
  "test_07_03_LotsInABox",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    <kite9-container id="c1">
      {Array.from({ length: 7 }, (_, i) => (
        <kite9-glyph id={`fan-${i}`} label={`fan-${i}`} />
      ))}
    </kite9-container>
    {Array.from({ length: 7 }, (_, i) =>
      link(`l${i}`, "g1", `fan-${i}`),
    )}
  </kite9-diagram>,
);

checkLayout(
  "test_07_04_RightFanFixedFirst",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    {Array.from({ length: 5 }, (_, i) => (
      <kite9-glyph id={`fan-${i}`} label={`f${i}`} />
    ))}
    {link("l0", "g1", "fan-0", { drawDirection: "right" })}
    {Array.from({ length: 4 }, (_, i) =>
      link(`c${i}`, `fan-${i}`, `fan-${i + 1}`, { drawDirection: "down" }),
    )}
    {Array.from({ length: 4 }, (_, i) =>
      link(`f${i}`, "g1", `fan-${i + 1}`),
    )}
  </kite9-diagram>,
);

checkLayout(
  "test_07_05_LeftFanFixedFirst",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    {Array.from({ length: 5 }, (_, i) => (
      <kite9-glyph id={`fan-${i}`} label={`f${i}`} />
    ))}
    {link("l0", "g1", "fan-0", { drawDirection: "left" })}
    {Array.from({ length: 4 }, (_, i) =>
      link(`c${i}`, `fan-${i}`, `fan-${i + 1}`, { drawDirection: "down" }),
    )}
    {Array.from({ length: 4 }, (_, i) =>
      link(`f${i}`, "g1", `fan-${i + 1}`),
    )}
  </kite9-diagram>,
);

checkLayout(
  "test_07_06_DownFanFixedMiddles",
  <kite9-diagram id="d">
    <kite9-glyph id="g1" label="g1" />
    {Array.from({ length: 6 }, (_, i) => (
      <kite9-glyph id={`fan-${i}`} label={`f${i}`} />
    ))}
    {link("m1", "g1", "fan-2", { drawDirection: "down" })}
    {link("m2", "g1", "fan-3", { drawDirection: "down" })}
    {Array.from({ length: 5 }, (_, i) =>
      link(`c${i}`, `fan-${i}`, `fan-${i + 1}`, { drawDirection: "right" }),
    )}
    {link("f0", "g1", "fan-0")}
    {link("f1", "g1", "fan-1")}
    {link("f4", "g1", "fan-4")}
    {link("f5", "g1", "fan-5")}
  </kite9-diagram>,
);

checkLayout(
  "test_07_07_NoStepFan",
  <kite9-diagram id="d">
    <kite9-glyph id="src" label="wide source label here" />
    <kite9-container id="c1">
      {Array.from({ length: 4 }, (_, i) => (
        <kite9-glyph id={`t${i}`} label={`t${i}`} />
      ))}
    </kite9-container>
    {Array.from({ length: 4 }, (_, i) =>
      link(`l${i}`, "src", `t${i}`, { drawDirection: "up" }),
    )}
  </kite9-diagram>,
);

checkLayout(
  "test_07_08_NoFanTurn",
  <kite9-diagram id="d" layout="RIGHT">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    {link("l1", "a", "b")}
    {link("l2", "a", "b")}
    {link("l3", "a", "b")}
  </kite9-diagram>,
);
