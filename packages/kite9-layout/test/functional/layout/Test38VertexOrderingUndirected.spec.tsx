/**
 * Vertex ordering with undirected links (containers of glyphs, no draw directions).
 * old→new: Java Test26 (VertexOrderingUndirected) → test_38_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import {
  createXContainers,
  glyphIds,
  renderXContainer,
  type Layout,
  type XContainer,
} from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

/** Undirected links, ids `l1…ln`, in Java declaration order. */
function links(pairs: [string, string][]): ComponentChild[] {
  return pairs.map(([from, to], i) => link(`l${i + 1}`, from, to));
}

/** "top" holds containers 0–1, "bottom" holds containers 2–3 (Java `top`/`bottom`). */
function topAndBottom(
  cs: XContainer[],
  topLayout: Layout | undefined,
  bottomLayout: Layout | undefined,
  diagramLayout: Layout | undefined,
  linkElements: ComponentChild[],
): ComponentChild {
  return (
    <kite9-diagram id="bob" layout={diagramLayout}>
      <kite9-container id="top" layout={topLayout}>
        {renderXContainer(cs[0]!)}
        {renderXContainer(cs[1]!)}
      </kite9-container>
      <kite9-container id="bottom" layout={bottomLayout}>
        {renderXContainer(cs[2]!)}
        {renderXContainer(cs[3]!)}
      </kite9-container>
      {linkElements}
    </kite9-diagram>
  );
}

/** One overall container "co" holding all of `cs`. */
function overall(
  cs: XContainer[],
  linkElements: ComponentChild[],
): ComponentChild {
  return (
    <kite9-diagram id="diagram">
      <kite9-container id="co">{cs.map(renderXContainer)}</kite9-container>
      {linkElements}
    </kite9-diagram>
  );
}

checkLayout("test_38_01_BigSquare", (() => {
  const cs = createXContainers("g", 4, 4, "HORIZONTAL");
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    "HORIZONTAL",
    "HORIZONTAL",
    "VERTICAL",
    links([
      [out[0]![0]!, out[1]![0]!],
      [out[1]![1]!, out[3]![1]!],
      [out[2]![2]!, out[3]![2]!],
      [out[2]![3]!, out[0]![3]!],
    ]),
  );
})());

checkLayout("test_38_02_BigRow", (() => {
  const cs = createXContainers("g", 6, 4, "HORIZONTAL");
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    "HORIZONTAL",
    "HORIZONTAL",
    "HORIZONTAL",
    links([
      [out[0]![0]!, out[1]![0]!],
      [out[1]![1]!, out[2]![1]!],
      [out[2]![2]!, out[3]![2]!],
      [out[3]![3]!, out[0]![3]!],
    ]),
  );
})());

checkLayout("test_38_03_SimpleLine", (() => {
  const cs = createXContainers("g", 10, 1, "HORIZONTAL");
  const out = glyphIds(cs);
  return overall(
    cs,
    links([
      [out[0]![2]!, out[0]![1]!],
      [out[0]![7]!, out[0]![8]!],
      [out[0]![1]!, out[0]![8]!],
    ]),
  );
})());

checkLayout("test_38_04_Loose", (() => {
  const cs = createXContainers("g", 10, 1);
  const out = glyphIds(cs);
  return overall(
    cs,
    links([
      [out[0]![1]!, out[0]![4]!],
      [out[0]![1]!, out[0]![5]!],
      [out[0]![2]!, out[0]![6]!],
      [out[0]![3]!, out[0]![6]!],
      [out[0]![5]!, out[0]![8]!],
      [out[0]![6]!, out[0]![8]!],
      [out[0]![4]!, out[0]![9]!],
      [out[0]![4]!, out[0]![7]!],
    ]),
  );
})());

checkLayout(
  "test_38_05_Unlinked",
  overall(createXContainers("g", 10, 1), []),
);

checkLayout("test_38_06_BigSquare2", (() => {
  const cs = createXContainers("g", 4, 4);
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    undefined,
    undefined,
    undefined,
    links([
      [out[0]![0]!, out[1]![0]!],
      [out[1]![1]!, out[3]![1]!],
      [out[2]![2]!, out[3]![2]!],
      [out[2]![3]!, out[0]![3]!],
    ]),
  );
})());

checkLayout("test_38_07_BigSquare3", (() => {
  const cs = createXContainers("g", 4, 4, "VERTICAL");
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    "HORIZONTAL",
    "HORIZONTAL",
    undefined,
    links([
      [out[0]![0]!, out[1]![0]!],
      [out[1]![1]!, out[3]![1]!],
      [out[2]![2]!, out[3]![2]!],
      [out[2]![3]!, out[0]![3]!],
    ]),
  );
})());

checkLayout("test_38_08_BigRow2", (() => {
  const cs = createXContainers("g", 6, 4, "HORIZONTAL");
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    "HORIZONTAL",
    "HORIZONTAL",
    "HORIZONTAL",
    links([
      [out[0]![0]!, out[1]![0]!],
      [out[1]![1]!, out[2]![1]!],
      [out[2]![2]!, out[3]![2]!],
    ]),
  );
})());

checkLayout("test_38_09_BigSquareDebug", (() => {
  const cs = createXContainers("g", 4, 4);
  const out = glyphIds(cs);
  return topAndBottom(
    cs,
    undefined,
    undefined,
    undefined,
    links([[out[2]![3]!, out[0]![3]!]]),
  );
})());
