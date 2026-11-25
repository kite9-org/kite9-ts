/** Convert arranged RI positions/sizes into serializable {@link LayoutData}. */

import type {
  Diagram,
  DiagramElement,
  LayoutData,
  Rectangular,
  Size,
} from "@kite9/model";
import { DiagramElementType } from "@kite9/model";

const DEFAULT_GUTTER = 16;
const DEFAULT_MIN = 40;

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function leafConnecteds(root: Rectangular): Rectangular[] {
  const out: Rectangular[] = [];
  const walk = (r: Rectangular) => {
    const kids = r.getContents().filter(isRectangular) as Rectangular[];
    const connectedKids = kids.filter(
      (k) => k.getType() === DiagramElementType.CONNECTED_RECTANGULAR,
    );
    if (
      r.getType() === DiagramElementType.CONNECTED_RECTANGULAR &&
      connectedKids.length === 0
    ) {
      out.push(r);
    }
    for (const k of kids) walk(k);
  };
  walk(root);
  return out;
}

function sizeOf(r: Rectangular): Size {
  const s = r.getRenderingInformation().size;
  if (!s) return { w: DEFAULT_MIN, h: DEFAULT_MIN };
  return { w: Math.max(0, s.width()), h: Math.max(0, s.height()) };
}

function positionOf(r: Rectangular): { x: number; y: number } {
  const p = r.getRenderingInformation().position;
  if (!p) return { x: 0, y: 0 };
  return { x: p.x(), y: p.y() };
}

/**
 * Build {@link LayoutData} from post-compaction rendering information.
 * Single-glyph / simple scenes map to a 1×N or N×1 content grid with outer pads
 * derived from diagram vs leaf bounds.
 */
export function toLayoutData(diagram: Diagram): LayoutData {
  const leaves = leafConnecteds(diagram);
  const diagSize = sizeOf(diagram);
  const diagPos = positionOf(diagram);

  if (leaves.length === 0) {
    const w = Math.max(DEFAULT_MIN, diagSize.w);
    const h = Math.max(DEFAULT_MIN, diagSize.h);
    return {
      grid: {
        contentCols: 1,
        contentRows: 1,
        gutter: DEFAULT_GUTTER,
        minCol: DEFAULT_MIN,
        minRow: DEFAULT_MIN,
        contentColSizes: [w],
        contentRowSizes: [h],
        colSizes: [DEFAULT_GUTTER, DEFAULT_GUTTER, w, DEFAULT_GUTTER, DEFAULT_GUTTER],
        rowSizes: [DEFAULT_GUTTER, DEFAULT_GUTTER, h, DEFAULT_GUTTER, DEFAULT_GUTTER],
      },
      placements: {},
      routes: {},
    };
  }

  // Sort by (y, x) for stable grid assignment
  const sorted = [...leaves].sort((a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    return pa.y - pb.y || pa.x - pb.x || a.getID().localeCompare(b.getID());
  });

  // For the first milestone, place each leaf in its own column of a single row
  // when they share similar y; otherwise one column, multiple rows.
  const ys = sorted.map((l) => positionOf(l).y);
  const sameRow = ys.every((y) => Math.abs(y - ys[0]!) < 1);

  const contentCols = sameRow ? sorted.length : 1;
  const contentRows = sameRow ? 1 : sorted.length;
  const contentColSizes: number[] = [];
  const contentRowSizes: number[] = [];
  const placements: LayoutData["placements"] = {};

  if (sameRow) {
    let maxH = DEFAULT_MIN;
    for (let i = 0; i < sorted.length; i++) {
      const leaf = sorted[i]!;
      const sz = sizeOf(leaf);
      contentColSizes.push(Math.max(DEFAULT_MIN, sz.w));
      maxH = Math.max(maxH, sz.h);
      placements[leaf.getID()] = {
        col: i + 1,
        row: 1,
        size: { w: sz.w, h: sz.h },
      };
    }
    contentRowSizes.push(maxH);
  } else {
    let maxW = DEFAULT_MIN;
    for (let i = 0; i < sorted.length; i++) {
      const leaf = sorted[i]!;
      const sz = sizeOf(leaf);
      contentRowSizes.push(Math.max(DEFAULT_MIN, sz.h));
      maxW = Math.max(maxW, sz.w);
      placements[leaf.getID()] = {
        col: 1,
        row: i + 1,
        size: { w: sz.w, h: sz.h },
      };
    }
    contentColSizes.push(maxW);
  }

  // Outer pads from diagram bounds vs first/last leaf
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const fp = positionOf(first);
  const lp = positionOf(last);
  const fs = sizeOf(first);
  const ls = sizeOf(last);

  const padLeft = Math.max(0, Math.round(fp.x - diagPos.x));
  const padTop = Math.max(0, Math.round(fp.y - diagPos.y));
  const padRight = Math.max(
    0,
    Math.round(diagPos.x + diagSize.w - (lp.x + ls.w)),
  );
  const padBottom = Math.max(
    0,
    Math.round(diagPos.y + diagSize.h - (lp.y + fs.h)),
  );

  const outerL = Math.max(DEFAULT_GUTTER, padLeft || DEFAULT_GUTTER);
  const outerR = Math.max(DEFAULT_GUTTER, padRight || DEFAULT_GUTTER);
  const outerT = Math.max(DEFAULT_GUTTER, padTop || DEFAULT_GUTTER);
  const outerB = Math.max(DEFAULT_GUTTER, padBottom || DEFAULT_GUTTER);

  const colSizes: number[] = [outerL, outerL];
  for (let c = 0; c < contentCols; c++) {
    if (c > 0) colSizes.push(DEFAULT_GUTTER);
    colSizes.push(contentColSizes[c]!);
  }
  colSizes.push(outerR, outerR);

  const rowSizes: number[] = [outerT, outerT];
  for (let r = 0; r < contentRows; r++) {
    if (r > 0) rowSizes.push(DEFAULT_GUTTER);
    rowSizes.push(contentRowSizes[r]!);
  }
  rowSizes.push(outerB, outerB);

  return {
    grid: {
      contentCols,
      contentRows,
      gutter: DEFAULT_GUTTER,
      minCol: DEFAULT_MIN,
      minRow: DEFAULT_MIN,
      contentColSizes,
      contentRowSizes,
      colSizes,
      rowSizes,
    },
    placements,
    routes: {},
  };
}
