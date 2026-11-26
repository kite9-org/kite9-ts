/**
 * Port of Java `GraphConstructionTools` (createGrid / createXContainers / createX)
 * for functional layout fixtures.
 */

import type { ComponentChild } from "preact";
import { link } from "./link.js";

export type Layout =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "HORIZONTAL"
  | "VERTICAL";

export type Dir = "up" | "down" | "left" | "right";

export type XGlyph = { id: string; label: string };

export type XContainer = {
  id: string;
  layout?: Layout;
  glyphs: XGlyph[];
};

export function renderGlyph(g: XGlyph): ComponentChild {
  return <kite9-glyph id={g.id} label={g.label} />;
}

export function renderXContainer(c: XContainer): ComponentChild {
  return (
    <kite9-container id={c.id} layout={c.layout}>
      {c.glyphs.map(renderGlyph)}
    </kite9-container>
  );
}

/**
 * Java `createXContainers(prefix, glyphsPerContainer, containers, _, layout)`.
 * Glyph ids are `prefix + n` (n counts across containers), labels are `"" + n`;
 * container ids are `c0`, `c1`, …
 */
export function createXContainers(
  prefix: string,
  glyphsPerContainer: number,
  containers: number,
  layout?: Layout,
): XContainer[] {
  let gi = 0;
  const result: XContainer[] = [];
  for (let i = 0; i < containers; i++) {
    const glyphs: XGlyph[] = [];
    for (let j = 0; j < glyphsPerContainer; j++) {
      glyphs.push({ id: `${prefix}${gi}`, label: `${gi}` });
      gi++;
    }
    result.push({ id: `c${i}`, layout, glyphs });
  }
  return result;
}

/** `out[container][glyph]` ids — mirrors Java `Glyph[][]`. */
export function glyphIds(containers: XContainer[]): string[][] {
  return containers.map((c) => c.glyphs.map((g) => g.id));
}

/** Java `createX(prefix, n)`: loose glyphs with id and label `prefix + n`. */
export function createX(prefix: string, glyphs: number): XGlyph[] {
  const out: XGlyph[] = [];
  for (let j = 0; j < glyphs; j++) {
    out.push({ id: `${prefix}${j}`, label: `${prefix}${j}` });
  }
  return out;
}

/**
 * Java `createGrid(prefix, x, y, collection, fixDirection)`: an x-by-y grid of
 * glyphs joined by arrow bodies. `elements` holds glyphs + arrows in Java
 * insertion order; `links` holds the links joining them.
 */
export function createGrid(
  prefix: string,
  x: number,
  y: number,
  fixDirection: boolean,
): { glyphIds: string[][]; elements: ComponentChild[]; links: ComponentChild[] } {
  let arrowNo = 0;
  const ids: string[][] = [];
  const elements: ComponentChild[] = [];
  const links: ComponentChild[] = [];

  const connect = (from: string, to: string, dir?: Dir) => {
    links.push(link(`${from}-${to}`, from, to, { drawDirection: dir }));
  };

  for (let i = 0; i < x; i++) {
    ids[i] = [];
    for (let j = 0; j < y; j++) {
      const gid = `Glyph${prefix}${i}_${j}`;
      ids[i]![j] = gid;
      elements.push(<kite9-glyph id={gid} label={gid} />);
      if (j > 0) {
        const label = `a${prefix}${arrowNo++}`;
        elements.push(<kite9-arrow id={label} label={label} />);
        connect(ids[i]![j - 1]!, label, fixDirection ? "right" : undefined);
        connect(label, gid, fixDirection ? "right" : undefined);
      }
      if (i > 0) {
        const label = `a${prefix}${arrowNo++}`;
        elements.push(<kite9-arrow id={label} label={label} />);
        connect(ids[i - 1]![j]!, label, fixDirection ? "down" : undefined);
        connect(label, gid, fixDirection ? "down" : undefined);
      }
    }
  }

  return { glyphIds: ids, elements, links };
}
