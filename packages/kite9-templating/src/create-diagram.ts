import {
  BorderTraversal,
  ConnectionsSeparation,
  DiagramElementSizing,
  DiagramElementType,
  Direction,
  End,
  HorizontalAlignment,
  Layout,
  Measurement,
  VerticalAlignment,
  PLACEMENT_NONE,
  placement,
  type AlignedRectangular,
  type Connected,
  type ConnectedRectangular,
  type Connection,
  type ContainerPosition,
  type Diagram,
  type DiagramElement,
  Dimension,
  type Label,
  type Placement,
  type Port,
  type Rectangular,
  type Terminator,
  type Temporary,
  gridContainerPosition,
} from "@kite9/model";
import { createRectangleRI, createRouteRI, StubDimension2D } from "./rendering-stubs.js";
import {
  localTag,
  paintHost,
  resolveHostElementType,
  type TemplatePack,
} from "./template-pack.js";

const SKIP_TAGS = new Set([
  "hints",
  "stereotype",
  "text-lines",
  "symbols",
  "text",
  "text-line",
  "label", // glyph/container title text — not a model Label
  "from",
  "to",
  "fromdecoration",
  "todecoration",
  "renderinginformation",
  "size",
  "position",
  "internalsize",
  "internalposition",
  "boldtext",
  "bodytext",
  "name",
  "alllinks",
  "path",
  "contradicting",
  "comp-shape",
]);

type BuildContext = {
  pack: TemplatePack;
  byId: Map<string, DiagramElement>;
  connections: Connection[];
  autoId: number;
};

function attr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}

function childElements(el: Element): Element[] {
  return Array.from(el.children) as Element[];
}

function findChild(el: Element, ...tags: string[]): Element | null {
  const want = new Set(tags.map((t) => t.toLowerCase()));
  return (
    childElements(el).find((c) => want.has(localTag(c).toLowerCase())) ?? null
  );
}

function textContentTrim(el: Element | null): string {
  if (!el) return "";
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseDirection(raw: string | null): Direction | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase().replace(/-/g, "_");
  return (Direction as Record<string, Direction>)[key] ?? null;
}

/** Count tracks in a computed `grid-template-*` value (`none` / `auto` → 0). */
function countGridTemplateTracks(value: string): number {
  const v = value.trim();
  if (!v || v === "none" || v === "auto") return 0;
  const repeat = /^repeat\(\s*(\d+)\s*,/i.exec(v);
  if (repeat) {
    const n = Number.parseInt(repeat[1]!, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  // Computed values are usually space-separated lengths (e.g. "100px 100px").
  return v.split(/\s+/).filter(Boolean).length;
}

/**
 * Map CSS Grid line placement (`grid-column` / `grid-row`, 1-based lines) to a
 * 0-based inclusive kite9 occupies range. Returns null for `auto` / unset.
 */
function cssGridLinesToOccupies(
  value: string,
): ReturnType<typeof gridContainerPosition> | null {
  const v = value.trim().toLowerCase();
  if (!v || v === "auto" || v === "auto / auto") return null;
  const parts = v.split("/").map((p) => p.trim());
  const parseLine = (raw: string): number | null => {
    if (!raw || raw === "auto") return null;
    const span = /^span\s+(\d+)$/i.exec(raw);
    if (span) return null; // needs a start line; handled below
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };
  const startLine = parseLine(parts[0] ?? "");
  if (startLine == null) return null;
  let endLine: number | null = null;
  if (parts[1]) {
    const span = /^span\s+(\d+)$/i.exec(parts[1]);
    if (span) {
      const n = Number.parseInt(span[1]!, 10);
      endLine = startLine + (Number.isFinite(n) ? n : 1);
    } else {
      endLine = parseLine(parts[1]);
    }
  }
  // CSS end line is exclusive; kite9 occupies to is inclusive.
  const from = startLine - 1;
  const to = endLine != null ? endLine - 2 : from;
  if (from < 0 || to < from) return null;
  return gridContainerPosition(from, to);
}

function nextId(ctx: BuildContext, el: Element): string {
  const id = attr(el, "id");
  if (id) return id;
  ctx.autoId += 1;
  return `auto:${ctx.autoId}`;
}

function compareById(a: DiagramElement, b: DiagramElement): number {
  return a.getID() < b.getID() ? -1 : a.getID() > b.getID() ? 1 : 0;
}

/** Resolve type via template paint + computed `--kite9-type` (tag selects chrome only). */
function elementTypeFor(el: Element, pack: TemplatePack): DiagramElementType | null {
  return resolveHostElementType(el, pack);
}

function isModelChild(el: Element, pack: TemplatePack): boolean {
  const tag = localTag(el).toLowerCase();
  if (SKIP_TAGS.has(tag)) return false;
  if (
    tag === "fromlabel" ||
    tag === "tolabel" ||
    tag === "kite9-from-label" ||
    tag === "kite9-to-label"
  ) {
    return false;
  }
  // Pack membership decides whether the tag is a candidate; CSS type is resolved at build.
  return pack.resolve(tag) != null;
}

function reverseDir(d: Direction): Direction {
  switch (d) {
    case Direction.UP:
      return Direction.DOWN;
    case Direction.DOWN:
      return Direction.UP;
    case Direction.LEFT:
      return Direction.RIGHT;
    case Direction.RIGHT:
      return Direction.LEFT;
  }
}

abstract class BaseElement implements DiagramElement {
  constructor(
    readonly el: Element,
    protected parentRef: DiagramElement | null,
    protected readonly id: string,
    protected readonly depth: number,
  ) {}

  getID(): string {
    return this.id;
  }

  getParent(): DiagramElement | null {
    return this.parentRef;
  }

  setParent(p: DiagramElement | null): void {
    this.parentRef = p;
  }

  getDepth(): number {
    return this.depth;
  }

  compareTo(other: DiagramElement): number {
    return compareById(this, other);
  }

  abstract getType(): DiagramElementType;
  abstract getRenderingInformation(): ReturnType<DiagramElement["getRenderingInformation"]>;
  abstract getContainer(): Rectangular | null;
}

/** Shared rectangular + connection bookkeeping; concrete kinds override getType(). */
export class RectangularAdapter extends BaseElement implements Rectangular, Connected {
  protected contents: DiagramElement[] = [];
  protected temporary: Temporary[] = [];
  protected readonly rectRI = createRectangleRI();
  diagram!: DiagramAdapter;

  constructor(
    el: Element,
    parent: DiagramElement | null,
    id: string,
    depth: number,
    diagram: DiagramAdapter | null,
  ) {
    super(el, parent, id, depth);
    if (diagram) this.diagram = diagram;
  }

  getType(): DiagramElementType {
    return DiagramElementType.CONNECTED_RECTANGULAR;
  }

  setContents(c: DiagramElement[]): void {
    this.contents = c;
  }

  getContents(): ReadonlyArray<DiagramElement> {
    return [...this.contents, ...this.temporary];
  }

  addTemporaryContent(t: Temporary): void {
    this.temporary.push(t);
  }

  getTraversalRule(_d: Direction): BorderTraversal {
    return BorderTraversal.LEAVING;
  }

  getLayout(): Layout | null {
    const attrRaw = attr(this.el, "layout") ?? attr(this.el, "kite9-layout");
    const cssRaw = getComputedStyle(this.el as Element)
      .getPropertyValue("--kite9-layout")
      .trim();
    const raw = attrRaw || cssRaw;
    if (!raw || raw === "none") return null;
    const key = raw.trim().toUpperCase();
    return (Layout as Record<string, Layout>)[key] ?? null;
  }

  getGridColumns(): number {
    const attrN = Number(
      attr(this.el, "grid-columns") ?? attr(this.el, "content-cols") ?? "",
    );
    if (attrN > 0) return attrN;
    const fromTemplate = countGridTemplateTracks(
      getComputedStyle(this.el as Element).gridTemplateColumns,
    );
    if (fromTemplate > 0) return fromTemplate;
    const cssN = Number.parseInt(
      getComputedStyle(this.el as Element)
        .getPropertyValue("--kite9-grid-columns")
        .trim(),
      10,
    );
    return Number.isFinite(cssN) && cssN > 0 ? cssN : 0;
  }

  getGridRows(): number {
    const attrN = Number(
      attr(this.el, "grid-rows") ?? attr(this.el, "content-rows") ?? "",
    );
    if (attrN > 0) return attrN;
    const fromTemplate = countGridTemplateTracks(
      getComputedStyle(this.el as Element).gridTemplateRows,
    );
    if (fromTemplate > 0) return fromTemplate;
    const cssN = Number.parseInt(
      getComputedStyle(this.el as Element)
        .getPropertyValue("--kite9-grid-rows")
        .trim(),
      10,
    );
    return Number.isFinite(cssN) && cssN > 0 ? cssN : 0;
  }

  deepContains(d: DiagramElement): boolean {
    if (d === this) return true;
    for (const c of this.getContents()) {
      if (c === d) return true;
      if (c instanceof RectangularAdapter && c.deepContains(d)) return true;
    }
    return false;
  }

  getRenderingInformation() {
    return this.rectRI;
  }

  getContainer(): Rectangular | null {
    let p: DiagramElement | null = this.parentRef;
    while (p) {
      if (p instanceof RectangularAdapter) return p;
      p = p.getParent();
    }
    return null;
  }

  getLinks(): ReadonlyArray<Connection> {
    return this.diagram.getConnectionsFor(this);
  }

  isConnectedDirectlyTo(c: Connected): boolean {
    return this.getLinks().some((l) => l.getFrom() === c || l.getTo() === c);
  }

  getConnectionsSeparationApproach(): ConnectionsSeparation {
    return ConnectionsSeparation.SEPARATE;
  }

  getLinkGutter(): number {
    return 0;
  }

  getLinkInset(): number {
    return 0;
  }

  /** CSS margin on the light-DOM host (px). */
  getMargin(d: Direction): number {
    const cs = getComputedStyle(this.el as Element);
    switch (d) {
      case Direction.UP:
        return parseFloat(cs.marginTop) || 0;
      case Direction.DOWN:
        return parseFloat(cs.marginBottom) || 0;
      case Direction.LEFT:
        return parseFloat(cs.marginLeft) || 0;
      case Direction.RIGHT:
        return parseFloat(cs.marginRight) || 0;
    }
  }

  /** CSS padding on the light-DOM host (px). */
  getPadding(d: Direction): number {
    const cs = getComputedStyle(this.el as Element);
    switch (d) {
      case Direction.UP:
        return parseFloat(cs.paddingTop) || 0;
      case Direction.DOWN:
        return parseFloat(cs.paddingBottom) || 0;
      case Direction.LEFT:
        return parseFloat(cs.paddingLeft) || 0;
      case Direction.RIGHT:
        return parseFloat(cs.paddingRight) || 0;
    }
  }

  /** Measured content box of the painted host, floored by CSS min-width/height. */
  getMinimumSize() {
    const el = this.el as HTMLElement;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const minW =
      parseFloat(cs.minWidth) ||
      parseFloat(cs.getPropertyValue("--kite9-min-width")) ||
      0;
    const minH =
      parseFloat(cs.minHeight) ||
      parseFloat(cs.getPropertyValue("--kite9-min-height")) ||
      0;
    const w = Math.max(
      minW,
      r.width || parseFloat(el.style.width) || 80,
    );
    const h = Math.max(
      minH,
      r.height || parseFloat(el.style.height) || 40,
    );
    return new StubDimension2D(w, h);
  }

  getSizing(horiz: boolean): DiagramElementSizing {
    const cs = getComputedStyle(this.el as Element);
    const axis = cs
      .getPropertyValue(
        horiz
          ? "--kite9-horizontal-sizing"
          : "--kite9-vertical-sizing",
      )
      .trim();
    const both = cs.getPropertyValue("--kite9-sizing").trim();
    const raw = (axis || both).toLowerCase();
    if (raw === DiagramElementSizing.MAXIMIZE) {
      return DiagramElementSizing.MAXIMIZE;
    }
    return DiagramElementSizing.MINIMIZE;
  }

  getContainerPosition(d: Dimension): ContainerPosition | null {
    const cs = getComputedStyle(this.el as Element);
    const fromCssGrid = cssGridLinesToOccupies(
      d === Dimension.H ? cs.gridColumn : cs.gridRow,
    );
    if (fromCssGrid) return fromCssGrid;

    const axisProp =
      d === Dimension.H ? "--kite9-occupies-x" : "--kite9-occupies-y";
    let raw = cs.getPropertyValue(axisProp).trim();
    if (!raw) {
      const all = cs.getPropertyValue("--kite9-occupies").trim();
      if (all) {
        const nums = all.split(/\s+/).map((p) => Number.parseInt(p, 10));
        if (nums.length === 2) {
          raw = String(d === Dimension.H ? nums[0] : nums[1]);
        } else if (nums.length >= 4) {
          raw =
            d === Dimension.H
              ? `${nums[0]} ${nums[1]}`
              : `${nums[2]} ${nums[3]}`;
        }
      }
    }
    if (!raw) return null;
    const parts = raw.split(/\s+/).map((p) => Number.parseInt(p, 10));
    const a = parts[0];
    const b = parts[1] ?? a;
    if (a === undefined || Number.isNaN(a) || Number.isNaN(b!)) return null;
    return gridContainerPosition(Math.min(a, b!), Math.max(a, b!));
  }
}

/** Glyph / context / container with fixed `CONNECTED_RECTANGULAR` type. */
export class ConnectedRectangularAdapter
  extends RectangularAdapter
  implements ConnectedRectangular, AlignedRectangular
{
  override getType(): DiagramElementType.CONNECTED_RECTANGULAR {
    return DiagramElementType.CONNECTED_RECTANGULAR;
  }

  getVerticalAlignment(): VerticalAlignment {
    const cs = getComputedStyle(this.el as Element);
    const self = cs.alignSelf.trim().toLowerCase();
    if (self === "start" || self === "flex-start" || self === "self-start") {
      return VerticalAlignment.TOP;
    }
    if (self === "end" || self === "flex-end" || self === "self-end") {
      return VerticalAlignment.BOTTOM;
    }
    if (self === "center") return VerticalAlignment.CENTER;
    const raw = cs.getPropertyValue("--kite9-vertical-align").trim().toLowerCase();
    if (raw === VerticalAlignment.TOP) return VerticalAlignment.TOP;
    if (raw === VerticalAlignment.BOTTOM) return VerticalAlignment.BOTTOM;
    return VerticalAlignment.CENTER;
  }

  getHorizontalAlignment(): HorizontalAlignment {
    const cs = getComputedStyle(this.el as Element);
    const self = cs.justifySelf.trim().toLowerCase();
    if (self === "start" || self === "flex-start" || self === "self-start" || self === "left") {
      return HorizontalAlignment.LEFT;
    }
    if (self === "end" || self === "flex-end" || self === "self-end" || self === "right") {
      return HorizontalAlignment.RIGHT;
    }
    if (self === "center") return HorizontalAlignment.CENTER;
    const raw = cs
      .getPropertyValue("--kite9-horizontal-align")
      .trim()
      .toLowerCase();
    if (raw === HorizontalAlignment.LEFT) return HorizontalAlignment.LEFT;
    if (raw === HorizontalAlignment.RIGHT) return HorizontalAlignment.RIGHT;
    return HorizontalAlignment.CENTER;
  }

  getConnectionAlignment(d: Dimension): Placement {
    const cs = getComputedStyle(this.el as Element);
    const raw = cs
      .getPropertyValue(
        d === Dimension.H
          ? "--kite9-horizontal-align-position"
          : "--kite9-vertical-align-position",
      )
      .trim();
    if (!raw) return PLACEMENT_NONE;
    if (raw.endsWith("%")) {
      const n = parseFloat(raw);
      return placement(Measurement.PERCENTAGE, Number.isFinite(n) ? n : 50);
    }
    const n = parseFloat(raw);
    return placement(Measurement.PIXELS, Number.isFinite(n) ? n : 50);
  }
}

export class DiagramAdapter extends RectangularAdapter implements Diagram {
  readonly allConnections: Connection[] = [];

  constructor(el: Element, id: string) {
    super(el, null, id, 0, null);
    this.diagram = this;
  }

  override getType(): DiagramElementType.DIAGRAM {
    return DiagramElementType.DIAGRAM;
  }

  registerConnection(c: Connection): void {
    this.allConnections.push(c);
  }

  getConnectionsFor(c: Connected): ReadonlyArray<Connection> {
    return this.allConnections.filter((co) => co.getFrom() === c || co.getTo() === c);
  }

  override getContainer(): Rectangular | null {
    return null;
  }
}

export class LabelAdapter extends RectangularAdapter implements Label, AlignedRectangular {
  constructor(
    el: Element,
    parent: DiagramElement | null,
    id: string,
    depth: number,
    diagram: DiagramAdapter,
    private readonly end: End,
  ) {
    super(el, parent, id, depth, diagram);
  }

  override getType(): DiagramElementType.LABEL {
    return DiagramElementType.LABEL;
  }

  getEnd(): End {
    return this.end;
  }

  getLabelPlacement(): Direction | null {
    return parseDirection(attr(this.el, "label-placement"));
  }

  getVerticalAlignment(): VerticalAlignment {
    return VerticalAlignment.CENTER;
  }

  getHorizontalAlignment(): HorizontalAlignment {
    return HorizontalAlignment.CENTER;
  }

  getConnectionAlignment(_d: Dimension): Placement {
    return PLACEMENT_NONE;
  }

  text(): string {
    const textEl = findChild(this.el, "text");
    if (textEl) return textContentTrim(textEl);
    // Direct text content, excluding nested structural tags' duplication
    return textContentTrim(this.el);
  }
}

export class PortAdapter extends RectangularAdapter implements Port {
  override getType(): DiagramElementType.PORT {
    return DiagramElementType.PORT;
  }

  getPortDirection(): Direction {
    return parseDirection(attr(this.el, "direction")) ?? Direction.RIGHT;
  }

  override getParent(): Rectangular {
    return this.parentRef as Rectangular;
  }

  override getContainerPosition(_d: Dimension): Placement {
    const raw =
      attr(this.el, "along") ??
      attr(this.el, "port-position") ??
      getComputedStyle(this.el as Element)
        .getPropertyValue("--kite9-port-position")
        .trim();
    if (!raw) return placement(Measurement.PERCENTAGE, 50);
    if (raw.endsWith("%")) {
      const n = parseFloat(raw);
      return placement(
        Measurement.PERCENTAGE,
        Number.isFinite(n) ? n : 50,
      );
    }
    const n = parseFloat(raw);
    return placement(
      Measurement.PIXELS,
      Number.isFinite(n) ? n : 50,
    );
  }
}

export class TerminatorAdapter extends RectangularAdapter implements Terminator {
  constructor(
    el: Element,
    parent: Connection,
    id: string,
    depth: number,
    diagram: DiagramAdapter,
    private readonly end: End,
    private readonly style: string,
  ) {
    super(el, parent, id, depth, diagram);
  }

  override getType(): DiagramElementType.TERMINATOR {
    return DiagramElementType.TERMINATOR;
  }

  getReservedLength(): number {
    return 0;
  }

  getMarkerReserve(): number {
    return 0;
  }

  styleMatches(t2: Terminator | null): boolean {
    if (!(t2 instanceof TerminatorAdapter)) return false;
    return this.style === t2.style;
  }

  getArrivalSide(): Direction | null {
    return null;
  }

  getConnection(): Connection {
    return this.parentRef as Connection;
  }

  getEnd(): End {
    return this.end;
  }

  getMargin(_d: Direction): number {
    return 0;
  }

  getPadding(_d: Direction): number {
    return 0;
  }

  getMinimumSize() {
    return new StubDimension2D(0, 0);
  }

  getSizing(_horiz: boolean): DiagramElementSizing {
    return DiagramElementSizing.MINIMIZE;
  }

  getStyleName(): string {
    return this.style;
  }
}

export class ConnectionAdapter extends BaseElement implements Connection {
  private fromRef!: Connected;
  private toRef!: Connected;
  private fromDec!: Terminator;
  private toDec!: Terminator;
  private fromLabel: Label | null = null;
  private toLabel: Label | null = null;
  private readonly routeRI = createRouteRI();
  private readonly drawDir: Direction | null;
  private readonly rank: number;

  constructor(
    el: Element,
    parent: DiagramElement | null,
    id: string,
    depth: number,
    private readonly diagram: DiagramAdapter,
    rank: number,
  ) {
    super(el, parent, id, depth);
    this.drawDir = parseDirection(
      attr(el, "drawDirection") ?? attr(el, "draw-direction"),
    );
    this.rank = rank;
  }

  getType(): DiagramElementType.CONNECTION {
    return DiagramElementType.CONNECTION;
  }

  bind(
    from: Connected,
    to: Connected,
    fromDec: Terminator,
    toDec: Terminator,
    fromLabel: Label | null,
    toLabel: Label | null,
  ): void {
    this.fromRef = from;
    this.toRef = to;
    this.fromDec = fromDec;
    this.toDec = toDec;
    this.fromLabel = fromLabel;
    this.toLabel = toLabel;
  }

  getFrom(): Connected {
    return this.fromRef;
  }

  getTo(): Connected {
    return this.toRef;
  }

  otherEnd(end: Connected): Connected {
    return end === this.fromRef ? this.toRef : this.fromRef;
  }

  meets(e: unknown): boolean {
    if (e == null) return false;
    if (typeof e === "object" && e !== null && "getFrom" in e) {
      const link = e as Connection;
      return (
        this.fromRef === link.getFrom() ||
        this.fromRef === link.getTo() ||
        this.toRef === link.getFrom() ||
        this.toRef === link.getTo()
      );
    }
    return e === this.fromRef || e === this.toRef;
  }

  getDrawDirection(): Direction | null {
    return this.drawDir;
  }

  getDrawDirectionFrom(from: Connected): Direction | null {
    if (this.drawDir == null) return null;
    return from === this.fromRef ? this.drawDir : reverseDir(this.drawDir);
  }

  getFromDecoration(): Terminator {
    return this.fromDec;
  }

  getToDecoration(): Terminator {
    return this.toDec;
  }

  getDecorationForEnd(end: DiagramElement): Terminator {
    return end === this.fromRef ? this.fromDec : this.toDec;
  }

  getFromLabel(): Label | null {
    return this.fromLabel;
  }

  getToLabel(): Label | null {
    return this.toLabel;
  }

  getRenderingInformation() {
    return this.routeRI;
  }

  getRank(): number {
    return this.rank;
  }

  getMargin(_d: Direction): number {
    return 0;
  }

  getPadding(_d: Direction): number {
    return 0;
  }

  getMinimumLength(): number {
    return 0;
  }

  getCornerRadius(): number {
    return 0;
  }

  getFromArrivalSide(): Direction | null {
    return this.fromDec.getArrivalSide();
  }

  getToArrivalSide(): Direction | null {
    return this.toDec.getArrivalSide();
  }

  getContainer(): Rectangular | null {
    return this.diagram;
  }

  getShape(): string | null {
    return attr(this.el, "shape");
  }
}

function resolveReference(
  linkEl: Element,
  endTag: string,
  ctx: BuildContext,
): Connected {
  const endEl = findChild(linkEl, endTag);
  const ref = endEl ? attr(endEl, "reference") : null;
  if (!ref) {
    throw new Error(`Link ${attr(linkEl, "id")} missing ${endTag} reference`);
  }
  const target = ctx.byId.get(ref);
  if (!target) {
    throw new Error(
      `Link ${attr(linkEl, "id")} ${endTag} reference "${ref}" not found`,
    );
  }
  return target as Connected;
}

function decorationStyle(linkEl: Element, tag: string): string {
  const el = findChild(linkEl, tag);
  return textContentTrim(el) || "NONE";
}

function decorationElement(linkEl: Element, tag: string): Element {
  return findChild(linkEl, tag) ?? linkEl;
}

function buildLabel(
  el: Element,
  parent: DiagramElement | null,
  ctx: BuildContext,
  diagram: DiagramAdapter,
  end: End,
): LabelAdapter {
  paintHost(el, ctx.pack);
  const id = nextId(ctx, el);
  const label = new LabelAdapter(
    el,
    parent,
    id,
    parent ? parent.getDepth() + 1 : 0,
    diagram,
    end,
  );
  label.setContents([]);
  ctx.byId.set(id, label);
  return label;
}

function buildConnection(
  el: Element,
  parent: DiagramElement | null,
  ctx: BuildContext,
  diagram: DiagramAdapter,
): ConnectionAdapter {
  const id = nextId(ctx, el);
  const rank = ctx.connections.length;
  const conn = new ConnectionAdapter(
    el,
    parent,
    id,
    parent ? parent.getDepth() + 1 : 1,
    diagram,
    rank,
  );
  ctx.byId.set(id, conn);

  const from = resolveReference(el, "from", ctx);
  const to = resolveReference(el, "to", ctx);

  const fromDec = new TerminatorAdapter(
    decorationElement(el, "fromDecoration"),
    conn,
    `${id}:fromDecoration`,
    conn.getDepth() + 1,
    diagram,
    End.FROM,
    decorationStyle(el, "fromDecoration"),
  );
  const toDec = new TerminatorAdapter(
    decorationElement(el, "toDecoration"),
    conn,
    `${id}:toDecoration`,
    conn.getDepth() + 1,
    diagram,
    End.TO,
    decorationStyle(el, "toDecoration"),
  );

  const fromLabelEl = findChild(el, "fromLabel", "kite9-from-label");
  const toLabelEl = findChild(el, "toLabel", "kite9-to-label");
  const fromLabel = fromLabelEl
    ? buildLabel(fromLabelEl, conn, ctx, diagram, End.FROM)
    : null;
  const toLabel = toLabelEl
    ? buildLabel(toLabelEl, conn, ctx, diagram, End.TO)
    : null;

  conn.bind(from, to, fromDec, toDec, fromLabel, toLabel);
  ctx.connections.push(conn);
  diagram.registerConnection(conn);
  return conn;
}

function obtainRectangular(
  el: Element,
  parent: DiagramElement | null,
  ctx: BuildContext,
  diagram: DiagramAdapter,
): RectangularAdapter {
  const id = nextId(ctx, el);
  const existing = ctx.byId.get(id);
  if (existing instanceof RectangularAdapter && !(existing instanceof LabelAdapter)) {
    existing.setParent(parent);
    existing.diagram = diagram;
    return existing;
  }
  const rect = new ConnectedRectangularAdapter(
    el,
    parent,
    id,
    parent ? parent.getDepth() + 1 : 1,
    diagram,
  );
  ctx.byId.set(id, rect);
  return rect;
}

function buildChildren(
  parentEl: Element,
  parent: DiagramElement | null,
  ctx: BuildContext,
  diagram: DiagramAdapter,
): DiagramElement[] {
  const out: DiagramElement[] = [];
  for (const child of childElements(parentEl)) {
    if (!isModelChild(child, ctx.pack)) continue;
    const built = buildElement(child, parent, ctx, diagram);
    if (built) out.push(built);
  }
  return out;
}

function buildElement(
  el: Element,
  parent: DiagramElement | null,
  ctx: BuildContext,
  diagram: DiagramAdapter,
): DiagramElement | null {
  const type = elementTypeFor(el, ctx.pack);
  if (type == null) return null;

  if (type === DiagramElementType.CONNECTION) {
    return buildConnection(el, parent, ctx, diagram);
  }

  // fromLabel/toLabel are attached via Connection, not as free contents.
  if (type === DiagramElementType.LABEL || type === DiagramElementType.TERMINATOR) {
    return null;
  }

  if (type === DiagramElementType.PORT) {
    const id = nextId(ctx, el);
    let port = ctx.byId.get(id);
    if (!(port instanceof PortAdapter)) {
      port = new PortAdapter(
        el,
        parent,
        id,
        parent ? parent.getDepth() + 1 : 1,
        diagram,
      );
      ctx.byId.set(id, port);
    } else {
      port.setParent(parent);
      port.diagram = diagram;
    }
    (port as PortAdapter).setContents(buildChildren(el, port, ctx, diagram));
    return port;
  }

  const rect = obtainRectangular(el, parent, ctx, diagram);
  rect.setContents(buildChildren(el, rect, ctx, diagram));
  return rect;
}

const DIAGRAM_TAGS = new Set(["diagram", "kite9-diagram"]);
const CONNECTED_TAGS = new Set([
  "glyph",
  "context",
  "arrow",
  "key",
  "kite9-glyph",
  "kite9-container",
  "kite9-arrow",
  "kite9-key",
]);

function isDiagramHost(el: Element): boolean {
  return DIAGRAM_TAGS.has(localTag(el).toLowerCase());
}

function findDiagramHost(root: Element): Element | null {
  if (isDiagramHost(root)) return root;
  const direct = childElements(root).find(isDiagramHost);
  if (direct) return direct;
  if (typeof root.querySelector === "function") {
    for (const tag of DIAGRAM_TAGS) {
      const found = root.querySelector(tag);
      if (found) return found;
    }
  }
  return null;
}

function indexConnectedIds(
  root: Element,
  diagram: DiagramAdapter,
  ctx: BuildContext,
): void {
  const walk = (el: Element): void => {
    for (const child of childElements(el)) {
      const type = elementTypeFor(child, ctx.pack);
      const tag = localTag(child).toLowerCase();
      if (
        type === DiagramElementType.CONNECTED_RECTANGULAR ||
        CONNECTED_TAGS.has(tag)
      ) {
        const id = attr(child, "id");
        if (id && !ctx.byId.has(id)) {
          ctx.byId.set(id, new ConnectedRectangularAdapter(child, diagram, id, 1, diagram));
        }
      }
      if (type !== DiagramElementType.CONNECTION) {
        walk(child);
      }
    }
  };
  walk(root);
}

/** Build a Diagram model from a light-DOM HTML root (`kite9-diagram`). */
export function createDiagram(root: Element, pack: TemplatePack): Diagram {
  const diagramEl = findDiagramHost(root);
  if (!diagramEl) throw new Error("createDiagram: no <diagram> / <kite9-diagram> root found");

  // Paint root chrome first so `--kite9-type` and shadow stage exist on the scene host.
  resolveHostElementType(diagramEl, pack);

  const id = attr(diagramEl, "id") || "diagram";
  const diagram = new DiagramAdapter(diagramEl, id);
  const ctx: BuildContext = {
    pack,
    byId: new Map(),
    connections: [],
    autoId: 0,
  };
  ctx.byId.set(id, diagram);

  indexConnectedIds(diagramEl, diagram, ctx);
  diagram.setContents(buildChildren(diagramEl, diagram, ctx, diagram));

  return diagram;
}
