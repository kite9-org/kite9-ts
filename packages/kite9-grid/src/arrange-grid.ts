/**
 * Direct LEFT/RIGHT/UP/DOWN/GRID placer → flattened {@link LayoutData}.
 * Omits `routes`. Unsupported layouts throw.
 */

import {
  DiagramElementType,
  Dimension,
  Direction,
  Layout,
  type BoxInsets,
  type ConnectedRectangular,
  type Diagram,
  type DiagramElement,
  type GridContainerPosition,
  type GridLayout,
  type LayoutData,
  type LayoutPlacement,
  type Rectangular,
  type SizedRectangular,
} from "@kite9/model";
import {
  authoredCssMins,
  authoredCssSize,
  type ElementSizer,
} from "./sizer.js";

/** No pad/gutter tracks — spacing is CSS margin on placements. */
export const DEFAULT_GUTTER = 0;
export const DEFAULT_MIN = 40;

type CellPlacement = {
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
  size?: { w: number; h: number };
  margin?: BoxInsets;
};

type Block = {
  /** Content cols occupied by this block. */
  cols: number;
  /** Content rows occupied by this block. */
  rows: number;
  /** Relative 1-based placements within the block. */
  placements: Record<string, CellPlacement>;
  /** Content track sizes (length = cols / rows). */
  colSizes: number[];
  rowSizes: number[];
};

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function isConnectedRectangular(
  de: DiagramElement,
): de is ConnectedRectangular {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
}

function ceilPx(n: number): number {
  return Math.max(1, Math.ceil(n));
}

function unsupported(layout: Layout | null, id: string): never {
  throw new Error(
    `arrangeGrid: unsupported layout ${layout ?? "null"} on ${id} (supported: left/right/up/down/grid)`,
  );
}

function occupiesRange(
  de: Rectangular,
  d: Dimension,
): { from: number; to: number } | null {
  const pos = de.getContainerPosition(d) as GridContainerPosition | null;
  if (!pos || !pos.isSet()) return null;
  return { from: pos.getFrom(), to: pos.getTo() };
}

function mergeTrackSizes(into: number[], from: number[], offset: number): void {
  for (let i = 0; i < from.length; i++) {
    const idx = offset + i;
    into[idx] = Math.max(into[idx] ?? DEFAULT_MIN, from[i] ?? DEFAULT_MIN);
  }
}

function offsetPlacements(
  placements: Record<string, CellPlacement>,
  colOff: number,
  rowOff: number,
): Record<string, CellPlacement> {
  const out: Record<string, CellPlacement> = {};
  for (const [id, p] of Object.entries(placements)) {
    out[id] = {
      ...p,
      col: p.col + colOff,
      row: p.row + rowOff,
      ...(p.colEnd != null ? { colEnd: p.colEnd + colOff } : {}),
      ...(p.rowEnd != null ? { rowEnd: p.rowEnd + rowOff } : {}),
    };
  }
  return out;
}

function readMargins(de: Rectangular): BoxInsets | undefined {
  const sized = de as Partial<SizedRectangular>;
  if (typeof sized.getMargin !== "function") return undefined;
  const margin: BoxInsets = {
    top: sized.getMargin(Direction.UP),
    right: sized.getMargin(Direction.RIGHT),
    bottom: sized.getMargin(Direction.DOWN),
    left: sized.getMargin(Direction.LEFT),
  };
  if (
    margin.top === 0 &&
    margin.right === 0 &&
    margin.bottom === 0 &&
    margin.left === 0
  ) {
    return undefined;
  }
  return margin;
}

function readPadding(de: Rectangular): BoxInsets {
  const sized = de as Partial<SizedRectangular>;
  if (typeof sized.getPadding !== "function") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  return {
    top: Math.ceil(sized.getPadding(Direction.UP) || 0),
    right: Math.ceil(sized.getPadding(Direction.RIGHT) || 0),
    bottom: Math.ceil(sized.getPadding(Direction.DOWN) || 0),
    left: Math.ceil(sized.getPadding(Direction.LEFT) || 0),
  };
}

/**
 * Wrap a laid-out child block with the container's CSS padding as extra
 * leading/trailing tracks. Nested siblings in a parent grid that share the
 * same logical cells then span pad+content together (see placeGrid splice).
 */
function withPaddingChrome(container: Rectangular, block: Block): Block {
  const pad = readPadding(container);
  const id = container.getID();
  let { cols, rows, colSizes, rowSizes, placements } = block;

  // Drop the container's own span — re-add after chrome so it covers pad+kids.
  const { [id]: _self, ...childPlacements } = placements;
  void _self;
  placements = childPlacements;

  if (pad.left > 0) {
    colSizes = [pad.left, ...colSizes];
    placements = offsetPlacements(placements, 1, 0);
    cols += 1;
  }
  if (pad.right > 0) {
    colSizes = [...colSizes, pad.right];
    cols += 1;
  }
  if (pad.top > 0) {
    rowSizes = [pad.top, ...rowSizes];
    placements = offsetPlacements(placements, 0, 1);
    rows += 1;
  }
  if (pad.bottom > 0) {
    rowSizes = [...rowSizes, pad.bottom];
    rows += 1;
  }

  placements[id] = {
    col: 1,
    row: 1,
    ...(cols > 1 ? { colEnd: cols } : {}),
    ...(rows > 1 ? { rowEnd: rows } : {}),
  };

  return { cols, rows, placements, colSizes, rowSizes };
}

function occupiedSize(
  contentW: number,
  contentH: number,
  margin?: BoxInsets,
): { w: number; h: number } {
  if (!margin) return { w: contentW, h: contentH };
  return {
    w: contentW + margin.left + margin.right,
    h: contentH + margin.top + margin.bottom,
  };
}

function leafBlock(de: Rectangular, sizer: ElementSizer): Block {
  const measured = sizer.measure(de);
  const cssSize = authoredCssSize(de);
  const w = ceilPx(cssSize?.w ?? measured.w);
  const h = ceilPx(cssSize?.h ?? measured.h);
  const margin = readMargins(de);
  const occ = occupiedSize(w, h, margin);
  const placement: CellPlacement = {
    col: 1,
    row: 1,
    ...(cssSize ? { size: { w: cssSize.w, h: cssSize.h } } : {}),
    ...(margin ? { margin } : {}),
  };
  return {
    cols: 1,
    rows: 1,
    placements: { [de.getID()]: placement },
    colSizes: [Math.max(DEFAULT_MIN, occ.w)],
    rowSizes: [Math.max(DEFAULT_MIN, occ.h)],
  };
}

function placeDirectional(
  container: Rectangular,
  layout: Layout,
  sizer: ElementSizer,
): Block {
  const kids = container
    .getContents()
    .filter((c) => isConnectedRectangular(c) || isRectangular(c))
    .filter((c) => c.getType() !== DiagramElementType.CONNECTION) as Rectangular[];

  const ordered =
    layout === Layout.LEFT || layout === Layout.UP
      ? [...kids].reverse()
      : kids;

  const childBlocks = ordered.map((c) => placeElement(c, sizer));
  const horizontal = layout === Layout.LEFT || layout === Layout.RIGHT;

  if (childBlocks.length === 0) {
    return withPaddingChrome(container, leafBlock(container, sizer));
  }

  if (horizontal) {
    const cols = childBlocks.reduce((s, b) => s + b.cols, 0);
    const rows = Math.max(...childBlocks.map((b) => b.rows), 1);
    // 0-init so nested padding tracks (12px) are not floored by DEFAULT_MIN.
    const colSizes = Array.from({ length: cols }, () => 0);
    const rowSizes = Array.from({ length: rows }, () => 0);
    const placements: Record<string, CellPlacement> = {};
    let col = 0;
    for (const b of childBlocks) {
      Object.assign(placements, offsetPlacements(b.placements, col, 0));
      mergeTrackSizes(colSizes, b.colSizes, col);
      mergeTrackSizes(rowSizes, b.rowSizes, 0);
      // Pad shorter blocks into full row height for parent span sizing.
      for (let r = 0; r < rows; r++) {
        rowSizes[r] = Math.max(rowSizes[r] ?? 0, b.rowSizes[r] ?? 0);
      }
      col += b.cols;
    }
    for (let i = 0; i < cols; i++) {
      if ((colSizes[i] ?? 0) <= 0) colSizes[i] = DEFAULT_MIN;
    }
    for (let i = 0; i < rows; i++) {
      if ((rowSizes[i] ?? 0) <= 0) rowSizes[i] = DEFAULT_MIN;
    }
    placements[container.getID()] = {
      col: 1,
      row: 1,
      ...(cols > 1 ? { colEnd: cols } : {}),
      ...(rows > 1 ? { rowEnd: rows } : {}),
    };
    return withPaddingChrome(container, {
      cols,
      rows,
      placements,
      colSizes,
      rowSizes,
    });
  }

  const rows = childBlocks.reduce((s, b) => s + b.rows, 0);
  const cols = Math.max(...childBlocks.map((b) => b.cols), 1);
  const colSizes = Array.from({ length: cols }, () => 0);
  const rowSizes = Array.from({ length: rows }, () => 0);
  const placements: Record<string, CellPlacement> = {};
  let row = 0;
  for (const b of childBlocks) {
    Object.assign(placements, offsetPlacements(b.placements, 0, row));
    mergeTrackSizes(rowSizes, b.rowSizes, row);
    mergeTrackSizes(colSizes, b.colSizes, 0);
    for (let c = 0; c < cols; c++) {
      colSizes[c] = Math.max(colSizes[c] ?? 0, b.colSizes[c] ?? 0);
    }
    row += b.rows;
  }
  for (let i = 0; i < cols; i++) {
    if ((colSizes[i] ?? 0) <= 0) colSizes[i] = DEFAULT_MIN;
  }
  for (let i = 0; i < rows; i++) {
    if ((rowSizes[i] ?? 0) <= 0) rowSizes[i] = DEFAULT_MIN;
  }
  placements[container.getID()] = {
    col: 1,
    row: 1,
    ...(cols > 1 ? { colEnd: cols } : {}),
    ...(rows > 1 ? { rowEnd: rows } : {}),
  };
  return withPaddingChrome(container, {
    cols,
    rows,
    placements,
    colSizes,
    rowSizes,
  });
}

/**
 * Map `count` nested tracks across a logical span of `span` parent cells.
 * Returns how many physical tracks each logical cell in the span receives.
 */
function distributeSplits(span: number, count: number): number[] {
  const out = Array.from({ length: span }, () => 1);
  if (count <= span) return out;
  // Spread extra tracks as evenly as possible (left-biased remainder).
  const base = Math.floor(count / span);
  let rem = count - base * span;
  for (let i = 0; i < span; i++) {
    out[i] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  }
  return out;
}

/**
 * Cumulative physical start index for each logical cell given per-cell splits.
 */
function physicalStarts(splits: number[]): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const n of splits) {
    starts.push(at);
    at += n;
  }
  return starts;
}

function placeGrid(container: Rectangular, sizer: ElementSizer): Block {
  const kids = container
    .getContents()
    .filter((c) => isConnectedRectangular(c) || isRectangular(c))
    .filter((c) => c.getType() !== DiagramElementType.CONNECTION) as Rectangular[];

  type Entry = {
    de: Rectangular;
    block: Block;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  };

  const entries: Entry[] = [];
  let maxX = Math.max(0, container.getGridColumns() - 1);
  let maxY = Math.max(0, container.getGridRows() - 1);
  let nextAuto = 0;

  for (const de of kids) {
    // Nested layouts are fully resolved first (any depth), then spliced in.
    const block = placeElement(de, sizer);
    const xo = occupiesRange(de, Dimension.H);
    const yo = occupiesRange(de, Dimension.V);
    let x0: number;
    let x1: number;
    let y0: number;
    let y1: number;
    if (xo && yo) {
      x0 = xo.from;
      x1 = xo.to;
      y0 = yo.from;
      y1 = yo.to;
    } else {
      // Auto-place into next free cell on a growing row.
      x0 = nextAuto;
      x1 = nextAuto;
      y0 = 0;
      y1 = 0;
      nextAuto += 1;
    }
    // Keep authored occupies — do NOT expand logical cells to nested size.
    // Nested tracks subdivide the span instead (below).
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
    entries.push({ de, block, x0, x1, y0, y1 });
  }

  const logicalCols = Math.max(1, maxX + 1);
  const logicalRows = Math.max(1, maxY + 1);

  // Physical tracks per logical cell (subdivided by nested blocks).
  const colSplits = Array.from({ length: logicalCols }, () => 1);
  const rowSplits = Array.from({ length: logicalRows }, () => 1);

  for (const e of entries) {
    const spanC = e.x1 - e.x0 + 1;
    const spanR = e.y1 - e.y0 + 1;
    const distC = distributeSplits(spanC, e.block.cols);
    const distR = distributeSplits(spanR, e.block.rows);
    for (let i = 0; i < spanC; i++) {
      colSplits[e.x0 + i] = Math.max(colSplits[e.x0 + i]!, distC[i]!);
    }
    for (let i = 0; i < spanR; i++) {
      rowSplits[e.y0 + i] = Math.max(rowSplits[e.y0 + i]!, distR[i]!);
    }
  }

  const colStarts = physicalStarts(colSplits);
  const rowStarts = physicalStarts(rowSplits);
  const cols = colSplits.reduce((a, b) => a + b, 0);
  const rows = rowSplits.reduce((a, b) => a + b, 0);
  // Undivided logical cells start at DEFAULT_MIN; subdivided (pad/nested)
  // tracks start at 0 so small padding sizes are not floored up.
  const colSizes: number[] = [];
  for (const split of colSplits) {
    for (let i = 0; i < split; i++) {
      colSizes.push(split === 1 ? DEFAULT_MIN : 0);
    }
  }
  const rowSizes: number[] = [];
  for (const split of rowSplits) {
    for (let i = 0; i < split; i++) {
      rowSizes.push(split === 1 ? DEFAULT_MIN : 0);
    }
  }
  const placements: Record<string, CellPlacement> = {};

  /** Physical inclusive range covering logical cells [L0, L1]. */
  const physRange = (
    splits: number[],
    starts: number[],
    L0: number,
    L1: number,
  ): { start: number; end: number } => {
    const start = starts[L0] ?? 0;
    const end = (starts[L1] ?? 0) + (splits[L1] ?? 1) - 1;
    return { start, end };
  };

  /** Grow tracks in [start, end] so their sum is at least `need`. */
  const ensureSpanSum = (
    sizes: number[],
    start: number,
    end: number,
    need: number,
  ): void => {
    let sum = 0;
    for (let i = start; i <= end; i++) sum += sizes[i] ?? 0;
    const extra = need - sum;
    if (extra <= 0) return;
    const n = end - start + 1;
    if (n <= 0) return;
    const each = Math.floor(extra / n);
    let rem = extra - each * n;
    for (let i = start; i <= end; i++) {
      sizes[i] = (sizes[i] ?? 0) + each + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
    }
  };

  for (const e of entries) {
    const cRange = physRange(colSplits, colStarts, e.x0, e.x1);
    const rRange = physRange(rowSplits, rowStarts, e.y0, e.y1);
    const physC = cRange.end - cRange.start + 1;
    const physR = rRange.end - rRange.start + 1;

    // Map each nested local track into the physical span (even distribution).
    const mapAxis = (
      localCount: number,
      physStart: number,
      physCount: number,
      localIndex0: number,
    ): { start: number; end: number } => {
      if (localCount <= 0) return { start: physStart, end: physStart };
      // When nested fits exactly or we subdivided to match, 1:1.
      if (localCount === physCount) {
        return { start: physStart + localIndex0, end: physStart + localIndex0 };
      }
      // Proportional: local i covers a slice of the physical span.
      const start =
        physStart + Math.floor((localIndex0 * physCount) / localCount);
      const end =
        physStart +
        Math.floor(((localIndex0 + 1) * physCount) / localCount) -
        1;
      return { start, end: Math.max(start, end) };
    };

    for (const [id, p] of Object.entries(e.block.placements)) {
      const localC0 = p.col - 1;
      const localC1 = (p.colEnd ?? p.col) - 1;
      const localR0 = p.row - 1;
      const localR1 = (p.rowEnd ?? p.row) - 1;
      const c0 = mapAxis(e.block.cols, cRange.start, physC, localC0);
      const c1 = mapAxis(e.block.cols, cRange.start, physC, localC1);
      const r0 = mapAxis(e.block.rows, rRange.start, physR, localR0);
      const r1 = mapAxis(e.block.rows, rRange.start, physR, localR1);
      placements[id] = {
        col: c0.start + 1,
        row: r0.start + 1,
        ...(c1.end > c0.start ? { colEnd: c1.end + 1 } : {}),
        ...(r1.end > r0.start ? { rowEnd: r1.end + 1 } : {}),
        ...(p.size ? { size: p.size } : {}),
        ...(p.margin ? { margin: p.margin } : {}),
      };
    }

    // Ensure the entry element itself spans its full occupies → physical range.
    const prev = e.block.placements[e.de.getID()];
    placements[e.de.getID()] = {
      col: cRange.start + 1,
      row: rRange.start + 1,
      ...(cRange.end > cRange.start ? { colEnd: cRange.end + 1 } : {}),
      ...(rRange.end > rRange.start ? { rowEnd: rRange.end + 1 } : {}),
      ...(prev?.size ? { size: prev.size } : {}),
      ...(prev?.margin ? { margin: prev.margin } : {}),
    };

    // Merge nested track sizes: each local track's budget must fit its slice.
    for (let i = 0; i < e.block.cols; i++) {
      const slice = mapAxis(e.block.cols, cRange.start, physC, i);
      ensureSpanSum(
        colSizes,
        slice.start,
        slice.end,
        e.block.colSizes[i] ?? DEFAULT_MIN,
      );
    }
    for (let i = 0; i < e.block.rows; i++) {
      const slice = mapAxis(e.block.rows, rRange.start, physR, i);
      ensureSpanSum(
        rowSizes,
        slice.start,
        slice.end,
        e.block.rowSizes[i] ?? DEFAULT_MIN,
      );
    }
  }

  // Any track still at 0 (subdivided but never budgeted) gets a minimum.
  for (let i = 0; i < cols; i++) {
    if ((colSizes[i] ?? 0) <= 0) colSizes[i] = DEFAULT_MIN;
  }
  for (let i = 0; i < rows; i++) {
    if ((rowSizes[i] ?? 0) <= 0) rowSizes[i] = DEFAULT_MIN;
  }

  const result: Block = {
    cols,
    rows,
    placements,
    colSizes,
    rowSizes,
  };
  result.placements[container.getID()] = {
    col: 1,
    row: 1,
    ...(cols > 1 ? { colEnd: cols } : {}),
    ...(rows > 1 ? { rowEnd: rows } : {}),
  };
  return withPaddingChrome(container, result);
}

function placeElement(de: Rectangular, sizer: ElementSizer): Block {
  const layout = de.getLayout();
  if (layout == null) {
    // Leaf or unlaid-out container: if it has connected kids without layout, stack as single cell.
    const kids = de
      .getContents()
      .filter((c) => isConnectedRectangular(c)) as ConnectedRectangular[];
    if (kids.length === 0) return leafBlock(de, sizer);
    // Treat as a single measured box (children not expanded without a layout).
    return leafBlock(de, sizer);
  }
  if (
    layout === Layout.LEFT ||
    layout === Layout.RIGHT ||
    layout === Layout.UP ||
    layout === Layout.DOWN
  ) {
    return placeDirectional(de, layout, sizer);
  }
  if (layout === Layout.GRID) {
    return placeGrid(de, sizer);
  }
  unsupported(layout, de.getID());
}

function buildPhysicalGrid(
  contentCols: number,
  contentRows: number,
  contentColSizes: number[],
  contentRowSizes: number[],
): GridLayout {
  // One physical track per content cell — no outer pads / inter-cell gutters.
  const colSizes = Array.from(
    { length: contentCols },
    (_, i) => contentColSizes[i] ?? DEFAULT_MIN,
  );
  const rowSizes = Array.from(
    { length: contentRows },
    (_, i) => contentRowSizes[i] ?? DEFAULT_MIN,
  );

  return {
    contentCols,
    contentRows,
    gutter: 0,
    minCol: DEFAULT_MIN,
    minRow: DEFAULT_MIN,
    contentColSizes: [...colSizes],
    contentRowSizes: [...rowSizes],
    colSizes,
    rowSizes,
  };
}

/**
 * Arrange `diagram` with directional / CSS-grid layouts into flattened
 * {@link LayoutData}. Does not set `routes`.
 */
export function arrangeGrid(
  diagram: Diagram,
  sizer: ElementSizer,
): LayoutData {
  const rootLayout = diagram.getLayout();
  let block: Block;

  if (rootLayout == null) {
    // No layout on diagram: place each top-level connected in a single row (right).
    const kids = diagram
      .getContents()
      .filter((c) => isConnectedRectangular(c) || isRectangular(c))
      .filter((c) => c.getType() !== DiagramElementType.CONNECTION) as Rectangular[];
    if (kids.length === 0) {
      block = {
        cols: 1,
        rows: 1,
        placements: {},
        colSizes: [DEFAULT_MIN],
        rowSizes: [DEFAULT_MIN],
      };
    } else if (kids.length === 1 && kids[0]!.getLayout() != null) {
      block = placeElement(kids[0]!, sizer);
    } else {
      // Fake a RIGHT container using diagram contents.
      block = placeDirectional(diagram, Layout.RIGHT, sizer);
      delete block.placements[diagram.getID()];
    }
  } else if (
    rootLayout === Layout.LEFT ||
    rootLayout === Layout.RIGHT ||
    rootLayout === Layout.UP ||
    rootLayout === Layout.DOWN
  ) {
    block = placeDirectional(diagram, rootLayout, sizer);
    delete block.placements[diagram.getID()];
  } else if (rootLayout === Layout.GRID) {
    block = placeGrid(diagram, sizer);
    delete block.placements[diagram.getID()];
  } else {
    unsupported(rootLayout, diagram.getID());
  }

  const placements: LayoutPlacement[] = Object.entries(block.placements).map(
    ([id, p]) => ({
      id,
      col: p.col,
      row: p.row,
      ...(p.colEnd != null ? { colEnd: p.colEnd } : {}),
      ...(p.rowEnd != null ? { rowEnd: p.rowEnd } : {}),
      ...(p.size ? { size: p.size } : {}),
      ...(p.margin ? { margin: p.margin } : {}),
    }),
  );

  // Prefer CSS min-width/min-height (floor); fall back to definite width/height.
  // No pad/gutter frame — mins apply directly to the sum of content tracks.
  const mins = authoredCssMins(diagram);
  const authored = authoredCssSize(diagram);
  const floorW = mins?.w ?? authored?.w;
  const floorH = mins?.h ?? authored?.h;
  const colSizes = [...block.colSizes];
  const rowSizes = [...block.rowSizes];
  if (floorW != null) {
    distributeExtra(
      colSizes,
      Math.max(colSizes.reduce((a, b) => a + b, 0), floorW),
    );
  }
  if (floorH != null) {
    distributeExtra(
      rowSizes,
      Math.max(rowSizes.reduce((a, b) => a + b, 0), floorH),
    );
  }

  const grid = buildPhysicalGrid(block.cols, block.rows, colSizes, rowSizes);
  if (mins?.w != null) grid.minWidth = mins.w;
  if (mins?.h != null) grid.minHeight = mins.h;

  return { grid, placements };
}

/** Grow track sizes so their sum equals `target` (extra split across tracks). */
function distributeExtra(sizes: number[], target: number): void {
  const sum = sizes.reduce((a, b) => a + b, 0);
  const extra = target - sum;
  if (extra <= 0 || sizes.length === 0) return;
  const each = Math.floor(extra / sizes.length);
  let rem = extra - each * sizes.length;
  for (let i = 0; i < sizes.length; i++) {
    sizes[i] = (sizes[i] ?? DEFAULT_MIN) + each + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  }
}
