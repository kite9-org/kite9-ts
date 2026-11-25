import {
  DiagramElementType,
  gridContainerPosition,
  type ConnectedRectangular,
  type DiagramElement,
  type GridContainerPosition,
  type IntegerRange,
  type RectangleRenderingInformation,
  type Rectangular,
} from "@kite9/model";
import { Dimension } from "@kite9/model";
import type { DiagramElementFactory } from "../factory/DiagramElementFactory.js";
import { getReducedFraction } from "../../fraction/LongFraction.js";
import { BasicOPair } from "../../objects/OPair.js";
import { BasicIntegerRange } from "../../range/BasicIntegerRange.js";
import { notSet } from "../../range/IntegerRange.js";
import { Kite9LogFactory, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import { LogicException } from "../../../logging/LogicException.js";
import { Side } from "../../../compaction/Side.js";
import type { GridPositioner } from "./GridPositioner.js";

type Cells = Map<number, Map<number, DiagramElement>>;

function sorted(s: Iterable<number>): number[] {
  return [...s].sort((a, b) => a - b);
}

function isConnectedRectangular(de: DiagramElement): boolean {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
}

/** Tools for helping create Grid structure. */
export class GridPositionerImpl implements GridPositioner, Logable {
  private logInstance: Kite9Log | null | undefined;

  readonly placed = new Map<Rectangular, DiagramElement[][]>();

  constructor(
    private readonly factory: DiagramElementFactory<unknown>,
    log?: Kite9Log,
  ) {
    this.logInstance = log;
  }

  readonly prefix = "GP  ";
  readonly isLoggingEnabled = true;

  private get log(): Kite9Log | null {
    if (this.logInstance === undefined) {
      this.logInstance =
        Kite9LogFactory.factory != null ? Kite9LogFactory.instance(this) : null;
    }
    return this.logInstance;
  }

  placeOnGrid(gridContainer: Rectangular): DiagramElement[][] {
    const existing = this.placed.get(gridContainer);
    if (existing) {
      return existing;
    }

    const overlaps: DiagramElement[] = [];
    const out: Cells = new Map();
    const xOrdinals = new Set<number>();
    const yOrdinals = new Set<number>();

    // place elements in their correct positions, as far as possible; move overlaps to array.
    for (const diagramElement of gridContainer.getContents()) {
      if (this.shouldAddToGrid(diagramElement)) {
        const xpos = GridPositionerImpl.getXOccupies(diagramElement as Rectangular);
        const ypos = GridPositionerImpl.getYOccupies(diagramElement as Rectangular);
        if (
          !notSet(xpos) &&
          !notSet(ypos) &&
          GridPositionerImpl.ensureGrid(out, xpos, ypos, null, xOrdinals, yOrdinals) === null
        ) {
          GridPositionerImpl.ensureGrid(out, xpos, ypos, diagramElement, xOrdinals, yOrdinals);
        } else {
          overlaps.push(diagramElement);
        }
      }
    }

    // add remaining/dummy elements, by adding extra rows if need be.
    let cell = 0;
    if (overlaps.length > 0) {
      this.padOrdinal(xOrdinals, Math.max(1, gridContainer.getGridColumns()));
      this.padOrdinal(yOrdinals, Math.max(1, gridContainer.getGridRows()));
    }
    let xSize = xOrdinals.size;
    let ySize = yOrdinals.size;
    while (overlaps.length > 0) {
      const row = Math.floor(cell / xSize);
      const col = cell % xSize;
      const yOrder = sorted(yOrdinals);
      const xOrder = sorted(xOrdinals);
      if (row >= yOrder.length) {
        ySize++;
        const max = yOrder.length === 0 ? 0 : yOrder.reduce((a, b) => Math.max(a, b));
        yOrder.push(max + 1);
      }
      const co = xOrder[col]!;
      const ro = yOrder[row]!;
      const xpos = new BasicIntegerRange(co, co);
      const ypos = new BasicIntegerRange(ro, ro);
      const d = GridPositionerImpl.ensureGrid(out, xpos, ypos, null, xOrdinals, yOrdinals);
      if (d === null) {
        const next = overlaps.shift();
        if (next !== undefined) {
          GridPositionerImpl.ensureGrid(out, xpos, ypos, next, xOrdinals, yOrdinals);
        }
      }
      cell++;
    }

    ySize = this.removeDuplicatesAndEmptyRows(out, ySize, yOrdinals, xOrdinals);
    xSize = this.removeDuplicatesAndEmptyCols(out, xSize, yOrdinals, xOrdinals);

    // to array
    const yOrder = sorted(yOrdinals);
    const xOrder = sorted(xOrdinals);
    this.fillInTheBlanks(out, gridContainer, xOrder, yOrder);

    const done: DiagramElement[][] = yOrder.map((y) =>
      xOrder.map((x) => out.get(y)!.get(x)!),
    );

    const size = new BasicOPair(xSize, ySize);
    this.scaleCoordinates(done, size);
    const log = this.log;
    if (log != null && log.go()) {
      log.send("Grid Positions:");
      console.table(done.map((row) => row.map((el) => String(el))));
    }
    const crri = gridContainer.getRenderingInformation();
    crri.setGridXSize(size.a);
    crri.setGridYSize(size.b);
    this.placed.set(gridContainer, done);
    return done;
  }

  getMaxPlace(container: Rectangular, d: Dimension): number {
    const grid = this.placed.get(container);
    if (!grid) {
      throw new LogicException(`Grid not positioned: ${container.getID()}`);
    }
    return d === Dimension.H ? (grid[0]?.length ?? 0) : grid.length;
  }

  getPlaceOnGrid(de: DiagramElement, d: Dimension, side: Side): number {
    const c = de.getContainer()!;
    const grid = this.placed.get(c);
    if (!grid) {
      throw new LogicException(`Grid not positioned: ${c.getID()}`);
    }

    // Bounding box of all occurrences of `de` in the grid
    let minRow = Number.MAX_SAFE_INTEGER;
    let maxRow = Number.MIN_SAFE_INTEGER;
    let minCol = Number.MAX_SAFE_INTEGER;
    let maxCol = Number.MIN_SAFE_INTEGER;
    let found = false;

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]!;
      for (let col = 0; col < row.length; col++) {
        if (row[col] === de) {
          found = true;
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
    }

    if (!found) {
      throw new LogicException(
        `Element ${de.getID()} not found on grid for container ${c.getID()}`,
      );
    }

    if (d === Dimension.H) {
      switch (side) {
        case Side.START:
          return minCol;
        case Side.END:
          return maxCol + 1;
        default:
          throw new LogicException(`Side ${side} not valid for horizontal dimension`);
      }
    } else {
      switch (side) {
        case Side.START:
          return minRow;
        case Side.END:
          return maxRow + 1;
        default:
          throw new LogicException(`Side ${side} not valid for vertical dimension`);
      }
    }
  }

  private padOrdinal(ordinals: Set<number>, s: number): void {
    let max = ordinals.size === 0 ? 0 : Math.max(...ordinals);
    while (ordinals.size < s) {
      max = max + 1;
      ordinals.add(max);
    }
  }

  private fillInTheBlanks(
    contents: Cells,
    ord: Rectangular,
    xs: number[],
    ys: number[],
  ): void {
    for (const y of ys) {
      for (const x of xs) {
        let xMap = contents.get(y);
        if (!xMap) {
          xMap = new Map();
          contents.set(y, xMap);
        }

        if (!xMap.has(x)) {
          const toPlace = this.factory.createTemporaryConnected(
            ord as ConnectedRectangular,
            `${x}-${y}`,
          );
          toPlace.setContainerPosition(
            gridContainerPosition(x, x),
            gridContainerPosition(y, y),
          );
          ord.addTemporaryContent(toPlace);
          xMap.set(x, toPlace);
        }
      }
    }
  }

  private removeDuplicatesAndEmptyRows(
    out: Cells,
    height: number,
    yOrdinals: Set<number>,
    xOrdinals: Set<number>,
  ): number {
    let last: (DiagramElement | undefined)[] | null = null;
    for (const y of [...yOrdinals]) {
      const line = [...xOrdinals].map((x) => out.get(y)?.get(x));
      if (last !== null && sameLine(last, line)) {
        yOrdinals.delete(y);
        height--;
      } else if (line.every((e) => e === undefined)) {
        yOrdinals.delete(y);
        height--;
      }
      last = line;
    }
    return height;
  }

  private removeDuplicatesAndEmptyCols(
    out: Cells,
    width: number,
    yOrdinals: Set<number>,
    xOrdinals: Set<number>,
  ): number {
    let last: (DiagramElement | undefined)[] | null = null;
    for (const x of [...xOrdinals]) {
      const line = [...yOrdinals].map((y) => out.get(y)?.get(x));
      const remove =
        (last !== null && sameLine(last, line)) ||
        line.every((e) => e === undefined);
      if (remove) {
        xOrdinals.delete(x);
        width--;
      }
      last = line;
    }
    return width;
  }

  private shouldAddToGrid(diagramElement: DiagramElement): boolean {
    return isConnectedRectangular(diagramElement);
  }

  private scaleCoordinates(
    grid: DiagramElement[][],
    size: BasicOPair<number>,
  ): void {
    const xp = new Map<DiagramElement, [number, number]>();
    const yp = new Map<DiagramElement, [number, number]>();
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y]!.length; x++) {
        const de = grid[y]![x]!;
        const xr = xp.get(de) ?? [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
        xp.set(de, [Math.min(x, xr[0]), Math.max(x + 1, xr[1])]);
        const yr = yp.get(de) ?? [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
        yp.set(de, [Math.min(y, yr[0]), Math.max(y + 1, yr[1])]);
      }
    }
    for (const [de, [a, b]] of xp) {
      const [a1, b1] = yp.get(de)!;
      const ri = de.getRenderingInformation() as RectangleRenderingInformation;
      ri.setGridXPosition(
        new BasicOPair(getReducedFraction(a, size.a), getReducedFraction(b, size.a)),
      );
      ri.setGridYPosition(
        new BasicOPair(getReducedFraction(a1, size.b), getReducedFraction(b1, size.b)),
      );
    }
  }

  static getYOccupies(diagramElement: Rectangular): IntegerRange {
    return (diagramElement.getContainerPosition(Dimension.V) as GridContainerPosition).r;
  }

  static getXOccupies(diagramElement: Rectangular): IntegerRange {
    return (diagramElement.getContainerPosition(Dimension.H) as GridContainerPosition).r;
  }

  /**
   * Iterates over the grid squares occupied by the ranges and either checks that they are
   * empty (returning any occupant), or sets their value.
   */
  private static ensureGrid(
    out: Cells,
    xpos: IntegerRange,
    ypos: IntegerRange,
    inn: DiagramElement | null,
    xOrdinals: Set<number>,
    yOrdinals: Set<number>,
  ): DiagramElement | null {
    for (let x = xpos.from; x <= xpos.to; x++) xOrdinals.add(x);
    for (let y = ypos.from; y <= ypos.to; y++) yOrdinals.add(y);

    // check that the area to place in is empty
    let filled: DiagramElement | null = null;
    for (let x = xpos.from; x <= xpos.to; x++) {
      for (let y = ypos.from; y <= ypos.to; y++) {
        filled = filled ?? out.get(y)?.get(x) ?? null;
      }
    }
    if (filled !== null) {
      return filled;
    }
    if (inn === null) {
      return null;
    }
    for (let x = xpos.from; x <= xpos.to; x++) {
      for (let y = ypos.from; y <= ypos.to; y++) {
        let row = out.get(y);
        if (!row) {
          row = new Map();
          out.set(y, row);
        }
        row.set(x, inn);
      }
    }
    return inn;
  }
}

function sameLine(
  a: ReadonlyArray<DiagramElement | undefined>,
  b: ReadonlyArray<DiagramElement | undefined>,
): boolean {
  return a.length === b.length && a.every((e, i) => e === b[i]);
}
