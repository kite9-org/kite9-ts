/**
 * Grids and crossing edges.
 * old→new: Java Test10 (CrossingEdges) → test_23_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

/**
 * Port of Java `GraphConstructionTools.createGrid(x, y, …, fixDirection=true)`:
 * glyphs `Glyph{i}_{j}` joined by arrow hubs; j-steps go RIGHT, i-steps go DOWN.
 */
function grid(x: number, y: number): ComponentChild[] {
  const out: ComponentChild[] = [];
  let arrowNo = 0;
  const gid = (i: number, j: number) => `Glyph${i}_${j}`;
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      out.push(<kite9-glyph id={gid(i, j)} label={gid(i, j)} />);
      if (j > 0) {
        const a = `a${arrowNo++}`;
        out.push(<kite9-arrow id={a} label={a} />);
        out.push(
          link(`${gid(i, j - 1)}-${a}`, gid(i, j - 1), a, { drawDirection: "right" }),
          link(`${a}-${gid(i, j)}`, a, gid(i, j), { drawDirection: "right" }),
        );
      }
      if (i > 0) {
        const a = `a${arrowNo++}`;
        out.push(<kite9-arrow id={a} label={a} />);
        out.push(
          link(`${gid(i - 1, j)}-${a}`, gid(i - 1, j), a, { drawDirection: "down" }),
          link(`${a}-${gid(i, j)}`, a, gid(i, j), { drawDirection: "down" }),
        );
      }
    }
  }
  return out;
}

checkLayout(
  "test_23_01_Grid",
  <kite9-diagram id="D">{grid(3, 3)}</kite9-diagram>,
);

// http://www.kite9.com/content/cant-perform-merges
checkLayout(
  "test_23_02_CrossingEdges",
  <kite9-diagram id="D">
    {grid(2, 5)}
    {link("t1", "Glyph0_0", "Glyph0_2")}
    {link("t2", "Glyph0_1", "Glyph0_3")}
    {link("t3", "Glyph0_1", "Glyph0_4")}
  </kite9-diagram>,
  // Java overrides checkNoHops() → false (default here is already false).
  { checks: { checkNoHops: false } },
);

checkLayout(
  "test_23_03_SmallGrid",
  <kite9-diagram id="D">{grid(2, 2)}</kite9-diagram>,
);
