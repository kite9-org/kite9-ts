/**
 * Browser-side debug PNGs matching Java TestingEngine.drawPositions / drawSlideables.
 */

import { Dimension, type Rectangular } from "@kite9/model";
import {
  isCompoundGroup,
  isLeafGroup,
  isRectangular,
  PositionRoutingInfo,
  type Compaction,
  type CompactionSlideable,
  type Group,
  type GroupResult,
  type PositionRoutableHandler2D,
} from "@kite9/layout";

const COLORS = [
  "#000000",
  "#008000",
  "#ff0000",
  "#0000ff",
  "#a9a9a9",
  "#ffff00",
  "#ff00ff",
  "#ffa500",
  "#ffc0cb",
  "#00ffff",
  "#808080",
] as const;

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function setSlideableColour(
  ctx: CanvasRenderingContext2D,
  s: CompactionSlideable,
): void {
  if (s.getOrbitAnchors().length > 0) {
    ctx.strokeStyle = "rgba(100,100,100,0.39)";
    ctx.fillStyle = "rgba(100,100,100,0.39)";
  } else if (s.getIntersectAnchors().length > 0) {
    ctx.strokeStyle = "rgba(0,0,0,0.39)";
    ctx.fillStyle = "rgba(0,0,0,0.39)";
  } else if (s.getRectAnchors().length > 0) {
    ctx.strokeStyle = "rgba(255,0,0,0.39)";
    ctx.fillStyle = "rgba(255,0,0,0.39)";
  } else if (s.getConnAnchors().length > 0) {
    ctx.strokeStyle = "rgba(0,0,200,0.39)";
    ctx.fillStyle = "rgba(0,0,200,0.39)";
  } else {
    ctx.strokeStyle = "rgba(255,234,0,0.39)";
    ctx.fillStyle = "rgba(255,234,0,0.39)";
  }
}

function outlineShape(
  d: Rectangular,
  c: Compaction,
  ctx: CanvasRenderingContext2D,
): void {
  const hs = c.getSlackOptimisation(Dimension.H).getSlideablesFor(d);
  const vs = c.getSlackOptimisation(Dimension.V).getSlideablesFor(d);
  if (!hs || !vs) return;

  const width = hs.r.minimumPosition - hs.l.minimumPosition;
  const height = vs.r.minimumPosition - vs.l.minimumPosition;
  ctx.fillStyle = "rgba(119,119,119,0.13)";
  ctx.fillRect(
    hs.l.minimumPosition * 10 + 30,
    vs.l.minimumPosition * 10 + 30,
    width * 10,
    height * 10,
  );

  for (const i of d.getContents()) {
    if (isRectangular(i)) outlineShape(i, c, ctx);
  }
}

function findLowest(set: ReadonlySet<CompactionSlideable>): CompactionSlideable {
  let best: CompactionSlideable | null = null;
  for (const s of set) {
    if (!best || s.minimumPosition < best.minimumPosition) best = s;
  }
  if (!best) throw new Error("empty neighbour set");
  return best;
}

function findHighest(set: ReadonlySet<CompactionSlideable>): CompactionSlideable {
  let best: CompactionSlideable | null = null;
  for (const s of set) {
    if (!best || s.minimumPosition > best.minimumPosition) best = s;
  }
  if (!best) throw new Error("empty neighbour set");
  return best;
}

function checkOccupied(
  s: CompactionSlideable,
  occupied: Map<CompactionSlideable, number>,
): void {
  let nx = s.minimumPosition * 10 + 30;
  const used = new Set(occupied.values());
  while (used.has(nx)) nx += 5;
  occupied.set(s, nx);
}

function drawGroup(
  group: Group,
  rr: PositionRoutableHandler2D,
  cols: string[],
  ctx: CanvasRenderingContext2D,
  size: number,
  done: Set<Group>,
): void {
  if (isLeafGroup(group)) {
    if (done.has(group)) return;
    const pri = rr.getPlacedPosition(group);
    if (pri instanceof PositionRoutingInfo) {
      ctx.strokeStyle = cols[Math.abs(group.hashCode()) % cols.length]!;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      const x = pri.getMinX() * size;
      const y = pri.getMinY() * size;
      const w = pri.getWidth() * size;
      const h = pri.getHeight() * size;
      roundRect(ctx, x, y, w, h, 3);
      ctx.stroke();

      let id = `g${group.groupNumber}`;
      const connected = group.connected;
      if (connected != null) {
        id += `(${connected.getID()})`;
      }
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "12px sans-serif";
      ctx.fillText(id, pri.centerX() * size, pri.centerY() * size);
    }
    done.add(group);
  } else if (isCompoundGroup(group)) {
    drawGroup(group.a, rr, cols, ctx, size, done);
    drawGroup(group.b, rr, cols, ctx, size, done);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Java TestingEngine.drawPositions → PNG base64 (no data: prefix). */
export function drawPositionsPng(
  gr: GroupResult,
  rr: PositionRoutableHandler2D,
): string {
  const size = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = size + 60;
  canvas.height = size + 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("drawPositionsPng: no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = ["#008000", "#ff0000", "#0000ff", "#a9a9a9"];
  const top = gr.groups()[Symbol.iterator]().next().value as Group | undefined;
  if (top) drawGroup(top, rr, cols, ctx, size, new Set());

  return canvasToPngBase64(canvas);
}

/** Java TestingEngine.drawSlideables → PNG base64 (no data: prefix). */
export function drawCompactionPng(c2: Compaction): string {
  const hAll = [...c2.getSlackOptimisation(Dimension.H).getAllSlideables()];
  const vAll = [...c2.getSlackOptimisation(Dimension.V).getAllSlideables()];
  if (hAll.length === 0 || vAll.length === 0) {
    const empty = document.createElement("canvas");
    empty.width = 60;
    empty.height = 60;
    const ectx = empty.getContext("2d")!;
    ectx.fillStyle = "#ffffff";
    ectx.fillRect(0, 0, 60, 60);
    return canvasToPngBase64(empty);
  }

  const xSize = Math.max(...hAll.map((s) => s.minimumPosition));
  const ySize = Math.max(...vAll.map((s) => s.minimumPosition));

  const canvas = document.createElement("canvas");
  canvas.width = xSize * 10 + 60;
  canvas.height = ySize * 10 + 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("drawCompactionPng: no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  outlineShape(c2.getDiagram(), c2, ctx);

  let nextCol = 0;
  const occupiedV = new Map<CompactionSlideable, number>();
  const occupiedH = new Map<CompactionSlideable, number>();

  for (const l of vAll) {
    if (!l.isDone()) checkOccupied(l, occupiedV);
  }
  for (const l of hAll) {
    if (!l.isDone()) checkOccupied(l, occupiedH);
  }

  const dash = [4, 17];

  for (const l of vAll) {
    if (l.isDone()) continue;
    const y = occupiedV.get(l)!;
    setSlideableColour(ctx, l);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(xSize * 10 + 40, y);
    ctx.stroke();

    nextCol++;
    ctx.fillStyle = COLORS[nextCol % COLORS.length]!;
    ctx.font = "12px sans-serif";
    // Deterministic stand-in for Java's Random x jitter.
    ctx.fillText(`v${l.number}`, (l.number * 7) % 20, y - 10);
    ctx.fillText(`${l.minimumPosition}`, xSize * 10, y - 10);

    let c = 0;
    for (const h2 of c2.getNeighbourSetsOn(l)) {
      const lowest = findLowest(h2);
      const highest = findHighest(h2);
      ctx.strokeStyle = COLORS[c % COLORS.length]!;
      ctx.fillStyle = COLORS[c % COLORS.length]!;
      c = (c + 1) % COLORS.length;

      ctx.setLineDash(dash);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(occupiedH.get(lowest)!, y);
      ctx.lineTo(occupiedH.get(highest)!, y);
      ctx.stroke();

      for (const it of h2) {
        const x = occupiedH.get(it)!;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  for (const l of hAll) {
    if (l.isDone()) continue;
    const x = occupiedH.get(l)!;
    setSlideableColour(ctx, l);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, ySize * 10 + 40);
    ctx.stroke();

    nextCol++;
    ctx.fillStyle = COLORS[nextCol % COLORS.length]!;
    ctx.font = "12px sans-serif";
    ctx.fillText(`h${l.number}`, x, 10);
    ctx.fillText(`${l.minimumPosition}`, x, ySize * 10 + 50);

    let c = 0;
    for (const v2 of c2.getNeighbourSetsOn(l)) {
      const lowest = findLowest(v2);
      const highest = findHighest(v2);
      ctx.strokeStyle = COLORS[c % COLORS.length]!;
      ctx.fillStyle = COLORS[c % COLORS.length]!;
      c = (c + 1) % COLORS.length;

      ctx.setLineDash(dash);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, occupiedV.get(lowest)!);
      ctx.lineTo(x, occupiedV.get(highest)!);
      ctx.stroke();

      for (const it of v2) {
        const y = occupiedV.get(it)!;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  return canvasToPngBase64(canvas);
}
