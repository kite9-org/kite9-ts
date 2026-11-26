/**
 * N glyphs in each of M containers, glyph i of container j linked to glyph i
 * of container j+1, with glyph order shuffled by a seeded Java `Random`.
 * old→new: Java Test25 (NLinkedContainers) → test_37_* (renumbered to avoid display clash)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import {
  createXContainers,
  glyphIds,
  renderXContainer,
  type Dir,
  type Layout,
  type XContainer,
  type XGlyph,
} from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

const MASK = (1n << 48n) - 1n;
const MULT = 0x5deece66dn;

/** Minimal port of `java.util.Random` so the Java shuffle order is reproduced. */
class JavaRandom {
  private seed: bigint;

  constructor(seed: number) {
    this.seed = (BigInt(seed) ^ MULT) & MASK;
  }

  private next(bits: number): number {
    this.seed = (this.seed * MULT + 0xbn) & MASK;
    return Number(BigInt.asIntN(32, this.seed >> BigInt(48 - bits)));
  }

  nextInt(bound: number): number {
    let r = this.next(31);
    const m = bound - 1;
    if ((bound & m) === 0) {
      return Number((BigInt(bound) * BigInt(r)) >> 31n);
    }
    for (let u = r; (((u - (r = u % bound)) + m) | 0) < 0; u = this.next(31)) {
      // retry on int overflow, as in Java
    }
    return r;
  }
}

/**
 * Java `shuffleElements`: it walks a live `NodeList` while removing from it, so
 * only every second child (indices 0, 2, 4, …) is collected, shuffled with
 * `Collections.shuffle`, and re-appended after the untouched children.
 */
function shuffleElements(r: JavaRandom, glyphs: XGlyph[]): XGlyph[] {
  const live = [...glyphs];
  const items: XGlyph[] = [];
  for (let i = 0; i < live.length; i++) {
    items.push(live[i]!);
    live.splice(i, 1);
  }
  for (let i = items.length; i > 1; i--) {
    const j = r.nextInt(i);
    const tmp = items[i - 1]!;
    items[i - 1] = items[j]!;
    items[j] = tmp;
  }
  return [...live, ...items];
}

/** Java `testGrid(glyphs, containers, withinContainer, overallL, d)`. */
function nLinked(
  glyphs: number,
  containers: number,
  withinContainer?: Layout,
  overallL?: Layout,
  d?: Dir,
  firstContainerLayout?: Layout,
): ComponentChild {
  const r = new JavaRandom(101);
  const cs: XContainer[] = createXContainers(
    "g",
    glyphs,
    containers,
    withinContainer,
  );
  const out = glyphIds(cs);

  const links: ComponentChild[] = [];
  for (let i = 0; i < glyphs; i++) {
    for (let j = 0; j < containers - 1; j++) {
      links.push(
        link(`l${j}-${i}`, out[j]![i]!, out[j + 1]![i]!, {
          toDecoration: "ARROW",
          drawDirection: d,
        }),
      );
    }
  }

  if (firstContainerLayout) cs[0]!.layout = firstContainerLayout;

  const shuffled = cs.map((c) => ({
    ...c,
    glyphs: shuffleElements(r, c.glyphs),
  }));

  return (
    <kite9-diagram id="diagram">
      <kite9-container id="co" layout={overallL}>
        {shuffled.map(renderXContainer)}
      </kite9-container>
      {links}
    </kite9-diagram>
  );
}

checkLayout(
  "test_37_01_6Glyphs3LinkedContainersHVNull",
  nLinked(6, 3, "HORIZONTAL", "VERTICAL"),
);

checkLayout(
  "test_37_02_6Glyphs3LinkedContainersVHNull",
  nLinked(6, 3, "VERTICAL", "HORIZONTAL"),
);

checkLayout(
  "test_37_03_3Glyphs3LinkedContainersHVDown",
  nLinked(3, 3, "HORIZONTAL", "VERTICAL", "down"),
);

checkLayout(
  "test_37_04_6Glyphs3LinkedContainersVHRight",
  nLinked(6, 3, "VERTICAL", "HORIZONTAL", "right"),
);

checkLayout(
  "test_37_05_TwoFourLinkedContainersV",
  nLinked(2, 3, "HORIZONTAL"),
);

checkLayout(
  "test_37_06_TwoSevenLinkedContainers",
  nLinked(2, 15, "HORIZONTAL"),
);

checkLayout(
  "test_37_07_10Glyphs3LinkedContainersHVNull",
  nLinked(10, 3, "HORIZONTAL", "VERTICAL"),
);

checkLayout(
  "test_37_08_6Glyphs3LinkedContainersNUllNUllRight",
  nLinked(6, 3, undefined, undefined, "right"),
);

checkLayout(
  "test_37_09_TwoFourLinkedContainersH",
  nLinked(2, 3, "VERTICAL"),
);

checkLayout(
  "test_37_10_30Glyphs3LinkedContainersPartialRightHV",
  nLinked(30, 3, "HORIZONTAL", "VERTICAL", undefined, "RIGHT"),
  { skip: "Seems to go on forever (Java @Ignore)" },
);
