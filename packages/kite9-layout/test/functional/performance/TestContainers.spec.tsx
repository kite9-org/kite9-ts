/**
 * Many sibling containers — performance suite.
 * old→new: TestContainers (subset) → local `pnpm test:performance`
 */
import { checkLayoutHtml } from "../helpers/check-layout.js";

function containersHtml(n: number): string {
  const parts: string[] = [];
  const links: string[] = [];
  for (let i = 0; i < n; i++) {
    parts.push(
      `<kite9-container id="c${i}" label="c${i}"><kite9-glyph id="g${i}" label="g${i}"></kite9-glyph></kite9-container>`,
    );
  }
  for (let i = 0; i < n - 1; i++) {
    links.push(
      `<kite9-link id="l${i}"><from reference="g${i}"></from><to reference="g${i + 1}"></to><fromDecoration>NONE</fromDecoration><toDecoration>NONE</toDecoration></kite9-link>`,
    );
  }
  return `<kite9-diagram id="d">${parts.join("")}${links.join("")}</kite9-diagram>`;
}

checkLayoutHtml("perf_containers_8", containersHtml(8), {
  metrics: { connecteds: 8, connections: 7 },
  checks: { checkMidConnection: false },
});
checkLayoutHtml("perf_containers_16", containersHtml(16), {
  metrics: { connecteds: 16, connections: 15 },
  checks: { checkMidConnection: false },
});
checkLayoutHtml("perf_containers_24", containersHtml(24), {
  metrics: { connecteds: 24, connections: 23 },
  checks: { checkMidConnection: false },
});
