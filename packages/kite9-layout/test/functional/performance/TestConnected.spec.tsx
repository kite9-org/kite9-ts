/**
 * Random connected graphs — performance suite.
 * old→new: TestConnected → local `pnpm test:performance`
 */
import { checkLayoutHtml } from "../helpers/check-layout.js";

function diagramHtml(connecteds: number, connections: number, seed: number): string {
  // Deterministic PRNG (mulberry32).
  let t = seed >>> 0;
  const rand = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  const glyphs = Array.from(
    { length: connecteds },
    (_, i) => `<kite9-glyph id="g${i}" label="g${i}"></kite9-glyph>`,
  );
  const links: string[] = [];
  let n = 0;
  while (n < connections) {
    const a = Math.floor(rand() * connecteds);
    const b = Math.floor(rand() * connecteds);
    if (a === b) continue;
    links.push(
      `<kite9-link id="l${n}"><from reference="g${a}"></from><to reference="g${b}"></to><fromDecoration>NONE</fromDecoration><toDecoration>NONE</toDecoration></kite9-link>`,
    );
    n += 1;
  }
  return `<kite9-diagram id="d">${glyphs.join("")}${links.join("")}</kite9-diagram>`;
}

function suite(
  name: string,
  connecteds: number,
  connections: number,
): void {
  checkLayoutHtml(name, diagramHtml(connecteds, connections, 666 + connecteds * 1000 + connections), {
    metrics: { connecteds, connections },
    checks: { checkMidConnection: false },
  });
}

// Keep CI-local sizes modest; Java had larger ignored variants.
suite("perf_connected_10x30", 10, 30);
suite("perf_connected_15x50", 15, 50);
suite("perf_connected_20x80", 20, 80);
suite("perf_connected_25x100", 25, 100);
