/**
 * Container ↔ vertex linking.
 * old→new: Test35ContainerAndVertexLinking → test_35_01…test_35_09
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adlXmlToHtml } from "../helpers/adl-xml-to-html.js";
import { checkLayout, checkLayoutHtml } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

const xmlDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../thorough/fixtures/xml",
);

/** Java `checkEverythingStraight()` → false (the default). */
const opts = {};

checkLayoutHtml(
  "test_35_01_ContentsAndContainerLinked",
  adlXmlToHtml(readFileSync(path.join(xmlDir, "edge_route_problem.xml"), "utf8")),
  opts,
);

checkLayout(
  "test_35_02_ForceContentLink",
  <kite9-diagram id="D" layout="RIGHT">
    <kite9-glyph id="g0" label="g0" />
    <kite9-container id="con1" label="c1" layout="DOWN">
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
    </kite9-container>
    <kite9-glyph id="g4" label="g4" />
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    {link("l1", "con1", "g4")}
    {link("l2", "con1", "g5")}
    {link("l3", "g1", "g4")}
    {link("l4", "g2", "g4")}
    {link("l5", "g3", "g5")}
    {link("l6", "g6", "g1")}
    {link("l7", "g6", "g2")}
    {link("l8", "g6", "g3")}
    {link("l9", "g6", "con1")}
    {link("l10", "g0", "con1")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_03_NestedContextLink",
  <kite9-diagram id="D" layout="RIGHT">
    <kite9-glyph id="g0" label="g0" />
    <kite9-container id="outside" label="outside" layout="DOWN">
      <kite9-container id="inside" label="inside" layout="DOWN">
        <kite9-glyph id="g1" label="g1" />
        <kite9-glyph id="g2" label="g2" />
        <kite9-glyph id="g3" label="g3" />
      </kite9-container>
      <kite9-glyph id="g4" label="g4" />
      <kite9-glyph id="g5" label="g5" />
    </kite9-container>
    <kite9-glyph id="g6" label="g6" />
    {link("l1", "inside", "g4")}
    {link("l2", "inside", "g5")}
    {link("l3", "g1", "g4")}
    {link("l4", "g2", "g4")}
    {link("l5", "g3", "g5")}
    {link("l6", "g6", "g1")}
    {link("l7", "g6", "g2")}
    {link("l8", "g6", "g3")}
    {link("l9", "g6", "inside")}
    {link("l10", "g0", "inside")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_04_TwoContextLink",
  <kite9-diagram id="D" layout="HORIZONTAL">
    <kite9-glyph id="g0" label="g0" />
    <kite9-container id="con1" label="c1" layout="DOWN">
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
    </kite9-container>
    <kite9-container id="con2" label="c2" layout="DOWN">
      <kite9-glyph id="g4" label="g4" />
      <kite9-glyph id="g5" label="g5" />
      <kite9-glyph id="g6" label="g6" />
    </kite9-container>
    <kite9-glyph id="g7" label="g7" />
    {link("l1", "con1", "g0")}
    {link("l2", "con2", "g0")}
    {link("l3", "con2", "g7")}
    {link("l4", "con1", "g7")}
    {link("l5", "g1", "g7")}
    {link("l6", "g2", "g7")}
    {link("l7", "g3", "g7")}
    {link("l8", "g4", "g0")}
    {link("l9", "g5", "g0")}
    {link("l10", "g6", "g0")}
    <kite9-link id="l11" class="dotted">
      <from reference="con1" />
      <to reference="con2" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    {link("l12", "con2", "con1")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_05_TwoContextLink2",
  <kite9-diagram id="D" layout="RIGHT">
    <kite9-glyph id="g0" label="g0" />
    <kite9-container id="con1" label="c1" layout="DOWN">
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
    </kite9-container>
    <kite9-glyph id="g7" label="g7" />
    <kite9-container id="con2" label="c2" layout="DOWN">
      <kite9-glyph id="g4" label="g4" />
      <kite9-glyph id="g5" label="g5" />
      <kite9-glyph id="g6" label="g6" />
    </kite9-container>
    {link("l1", "con1", "g0")}
    {link("l2", "con2", "g0")}
    {link("l3", "con2", "g7")}
    {link("l4", "con1", "g7")}
    {link("l5", "g1", "g7")}
    {link("l6", "g2", "g7")}
    {link("l7", "g3", "g7")}
    {link("l8", "g4", "g0")}
    {link("l9", "g5", "g0")}
    {link("l10", "g6", "g0")}
    <kite9-link id="l11" class="dotted">
      <from reference="con1" />
      <to reference="con2" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    {link("l12", "con2", "con1")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_06_TwoContextLink3",
  <kite9-diagram id="D" layout="DOWN">
    <kite9-container id="con1" label="c1" layout="RIGHT">
      <kite9-glyph id="g1" label="g1" />
      <kite9-glyph id="g2" label="g2" />
      <kite9-glyph id="g3" label="g3" />
    </kite9-container>
    <kite9-glyph id="g0" label="g0" />
    <kite9-glyph id="g7" label="g7" />
    <kite9-container id="con2" label="c2" layout="RIGHT">
      <kite9-glyph id="g4" label="g4" />
      <kite9-glyph id="g5" label="g5" />
      <kite9-glyph id="g6" label="g6" />
    </kite9-container>
    {link("l1", "con1", "g0")}
    {link("l2", "con2", "g0")}
    {link("l3", "con2", "g7")}
    {link("l4", "con1", "g7")}
    {link("l5", "g1", "g7")}
    {link("l6", "g2", "g7")}
    {link("l7", "g3", "g7")}
    {link("l8", "g4", "g0")}
    {link("l9", "g5", "g0")}
    {link("l10", "g6", "g0")}
    <kite9-link id="l11" class="dotted">
      <from reference="con1" />
      <to reference="con2" />
      <fromDecoration>NONE</fromDecoration>
      <toDecoration>NONE</toDecoration>
    </kite9-link>
    {link("l12", "con2", "con1")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_07_OctopusContext",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c2" />
    <kite9-glyph id="g0" label="g0" />
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    <kite9-glyph id="g7" label="g7" />
    <kite9-glyph id="g8" label="g8" />
    <kite9-glyph id="g9" label="g9" />
    <kite9-glyph id="g10" label="g10" />
    <kite9-glyph id="g11" label="g11" />
    {link("l1", "con1", "g0")}
    {link("l2", "con1", "g1")}
    {link("l3", "con1", "g2")}
    {link("l4", "con1", "g3")}
    {link("l5", "con1", "g4")}
    {link("l6", "con1", "g5")}
    {link("l7", "con1", "g6")}
    {link("l8", "con1", "g7")}
    {link("l9", "con1", "g8")}
    {link("l10", "con1", "g9")}
    {link("l11", "con1", "g10")}
    {link("l12", "con1", "g11")}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_08_OctopusStraight",
  <kite9-diagram id="D">
    <kite9-container id="con1" label="c2" />
    <kite9-glyph id="g0" label="g0" />
    <kite9-glyph id="g1" label="g1" />
    <kite9-glyph id="g2" label="g2" />
    <kite9-glyph id="g3" label="g3" />
    <kite9-glyph id="g4" label="g4" />
    <kite9-glyph id="g5" label="g5" />
    <kite9-glyph id="g6" label="g6" />
    <kite9-glyph id="g7" label="g7" />
    <kite9-glyph id="g8" label="g8" />
    <kite9-glyph id="g9" label="g9" />
    <kite9-glyph id="g10" label="g10" />
    <kite9-glyph id="g11" label="g11" />
    {link("l1", "con1", "g0", { drawDirection: "right" })}
    {link("l2", "con1", "g1", { drawDirection: "right" })}
    {link("l3", "con1", "g2", { drawDirection: "right" })}
    {link("l4", "con1", "g3", { drawDirection: "right" })}
    {link("l5", "con1", "g4", { drawDirection: "right" })}
    {link("l6", "con1", "g5", { drawDirection: "down" })}
    {link("l7", "con1", "g6", { drawDirection: "down" })}
    {link("l8", "con1", "g7", { drawDirection: "down" })}
    {link("l9", "con1", "g8", { drawDirection: "down" })}
    {link("l10", "con1", "g9", { drawDirection: "up" })}
    {link("l11", "con1", "g10", { drawDirection: "up" })}
    {link("l12", "con1", "g11", { drawDirection: "up" })}
  </kite9-diagram>,
  opts,
);

checkLayout(
  "test_35_09_WithoutLinks",
  <kite9-diagram id="D" layout="DOWN">
    <kite9-container id="inside">
      <kite9-glyph id="g0" label="g0" />
      <kite9-glyph id="g2" label="g2" />
    </kite9-container>
    <kite9-glyph id="g1" label="g1" />
    {link("l1", "g0", "g2", { drawDirection: "down" })}
  </kite9-diagram>,
  opts,
);
