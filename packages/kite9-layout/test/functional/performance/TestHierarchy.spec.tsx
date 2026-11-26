/**
 * Nested containers with links — performance suite.
 * old→new: TestHierarchy (subset) → local `pnpm test:performance`
 */
import { checkLayoutHtml } from "../helpers/check-layout.js";

function nestedHtml(depth: number, branching: number): string {
  let id = 0;
  const links: string[] = [];

  function node(level: number): string {
    const my = `n${id++}`;
    if (level >= depth) {
      return `<kite9-glyph id="${my}" label="${my}"></kite9-glyph>`;
    }
    const children: string[] = [];
    for (let i = 0; i < branching; i++) {
      const child = node(level + 1);
      children.push(child);
    }
    // link first two leaf-ish ids inside this container when possible
    return `<kite9-container id="${my}" label="${my}">${children.join("")}</kite9-container>`;
  }

  const root = node(0);
  // simple chain of top-level glyphs for connections
  const leaves = Array.from({ length: Math.min(8, branching ** Math.max(1, depth - 1)) }, (_, i) => {
    const gid = `leaf${i}`;
    return `<kite9-glyph id="${gid}" label="${gid}"></kite9-glyph>`;
  });
  for (let i = 0; i < leaves.length - 1; i++) {
    links.push(
      `<kite9-link id="l${i}"><from reference="leaf${i}"></from><to reference="leaf${i + 1}"></to><fromDecoration>NONE</fromDecoration><toDecoration>NONE</toDecoration></kite9-link>`,
    );
  }

  return `<kite9-diagram id="d">${root}${leaves.join("")}${links.join("")}</kite9-diagram>`;
}

checkLayoutHtml("perf_hierarchy_d2_b3", nestedHtml(2, 3), {
  metrics: { connecteds: 2 * 3 },
  checks: { checkMidConnection: false },
});
checkLayoutHtml("perf_hierarchy_d3_b2", nestedHtml(3, 2), {
  metrics: { connecteds: 3 * 2 },
  checks: { checkMidConnection: false },
});
checkLayoutHtml("perf_hierarchy_d3_b3", nestedHtml(3, 3), {
  metrics: { connecteds: 3 * 3 },
  checks: { checkMidConnection: false },
});
