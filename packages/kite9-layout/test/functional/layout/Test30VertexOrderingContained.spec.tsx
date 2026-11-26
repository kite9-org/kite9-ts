/**
 * Vertex ordering for glyphs spread across (nested) containers.
 * old→new: Test30VertexOrderingContained → test_30_01, 30_02, 30_04, 30_05
 * (there is no 30_3 in the Java source). HopLink → linkTest: "hop".
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import {
  createX,
  createXContainers,
  glyphIds,
  renderGlyph,
  renderXContainer,
  type Dir,
  type Layout,
  type XContainer,
} from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

/** "top" holds containers 0–1, "bottom" holds containers 2–3 (Java `top`/`bottom`). */
function topAndBottom(
  cs: XContainer[],
  diagramLayout: Layout,
  linkElements: ComponentChild[],
): ComponentChild {
  return (
    <kite9-diagram id="bob" layout={diagramLayout}>
      <kite9-container id="top" layout="HORIZONTAL">
        {renderXContainer(cs[0]!)}
        {renderXContainer(cs[1]!)}
      </kite9-container>
      <kite9-container id="bottom" layout="HORIZONTAL">
        {renderXContainer(cs[2]!)}
        {renderXContainer(cs[3]!)}
      </kite9-container>
      {linkElements}
    </kite9-diagram>
  );
}

checkLayout("test_30_01_BigSquareDirected", (() => {
  const cs = createXContainers("g", 4, 4, "HORIZONTAL");
  const out = glyphIds(cs);
  return topAndBottom(cs, "VERTICAL", [
    link("l1", out[0]![0]!, out[1]![0]!, {
      drawDirection: "right",
      linkTest: "hop",
    }),
    link("l2", out[1]![1]!, out[3]![1]!, {
      drawDirection: "down",
      linkTest: "hop",
    }),
    link("l3", out[2]![2]!, out[3]![2]!, {
      drawDirection: "right",
      linkTest: "hop",
    }),
    link("l4", out[0]![3]!, out[2]![3]!, {
      drawDirection: "down",
      linkTest: "hop",
    }),
  ]);
})());

checkLayout("test_30_02_BigL", (() => {
  const cs = createXContainers("g", 4, 4);
  const out = glyphIds(cs);
  return topAndBottom(cs, "VERTICAL", [
    link("l1", out[0]![0]!, out[1]![0]!, { drawDirection: "right" }),
    link("l2", out[0]![0]!, out[1]![1]!, { drawDirection: "right" }),
    link("l3", out[0]![0]!, out[2]![0]!, { drawDirection: "down" }),
    link("l4", out[0]![0]!, out[2]![1]!, { drawDirection: "down" }),
    link("l5", out[2]![1]!, out[3]![0]!, { drawDirection: "left" }),
    link("l6", out[2]![0]!, out[3]![1]!, { drawDirection: "left" }),
  ]);
})());

checkLayout("test_30_04_DifferentContainerDepths", (() => {
  const cs = createXContainers("g", 4, 2);
  const out = glyphIds(cs);
  const loose = createX("h", 12);
  const h = loose.map((g) => g.id);

  const specs: [string, string, Dir][] = [
    [out[0]![0]!, h[8]!, "left"],
    [out[0]![1]!, h[9]!, "left"],
    [out[0]![2]!, h[10]!, "left"],
    [out[0]![3]!, h[11]!, "left"],

    [out[0]![0]!, h[0]!, "right"],
    [out[0]![1]!, h[1]!, "right"],
    [out[0]![2]!, h[2]!, "right"],
    [out[0]![3]!, h[3]!, "right"],

    [out[1]![0]!, h[0]!, "left"],
    [out[1]![1]!, h[1]!, "left"],
    [out[1]![2]!, h[2]!, "left"],
    [out[1]![3]!, h[3]!, "left"],

    [out[1]![0]!, h[6]!, "right"],
    [out[1]![1]!, h[4]!, "right"],
    [out[1]![2]!, h[7]!, "right"],
    [out[1]![3]!, h[5]!, "right"],
  ];

  return (
    <kite9-diagram id="bob">
      {cs.map(renderXContainer)}
      {loose.map(renderGlyph)}
      {specs.map(([from, to, dir], i) =>
        link(`l${i + 1}`, from, to, { drawDirection: dir }),
      )}
    </kite9-diagram>
  );
})());

checkLayout(
  "test_30_05_SimpleOrderingLinkPromotion",
  <kite9-diagram id="bob" layout="DOWN">
    <kite9-container id="top" layout="RIGHT">
      <kite9-glyph id="a" label="a" />
      <kite9-glyph id="b" label="b" />
    </kite9-container>
    <kite9-container id="bottom" layout="HORIZONTAL">
      <kite9-glyph id="c" label="c" />
    </kite9-container>
    {link("l1", "a", "b")}
    {link("l2", "a", "c")}
  </kite9-diagram>,
);
