import {
  DiagramElementType,
  type Connected,
  type Connection,
  type Diagram,
  type DiagramElement,
  type Label,
  type Rectangular,
  type Terminator,
} from "@kite9/model";

export type ModelJson =
  | DiagramJson
  | ConnectedJson
  | ConnectionJson
  | LabelJson
  | PortJson
  | TerminatorJson
  | ElementJson;

type ElementJson = {
  type: DiagramElementType;
  id: string;
};

type DiagramJson = {
  type: DiagramElementType.DIAGRAM;
  id: string;
  contents: ModelJson[];
  connections: ConnectionJson[];
};

type ConnectedJson = {
  type: DiagramElementType.CONNECTED_RECTANGULAR;
  id: string;
  tag: string;
  shape?: string | null;
  layout?: string | null;
  gridColumns?: number;
  gridRows?: number;
  contents: ModelJson[];
};

type LabelJson = {
  type: DiagramElementType.LABEL;
  id: string;
  text: string;
  end: string;
};

type PortJson = {
  type: DiagramElementType.PORT;
  id: string;
  direction: string;
};

type TerminatorJson = {
  type: DiagramElementType.TERMINATOR;
  id: string;
  end: string;
  style: string;
};

type ConnectionJson = {
  type: DiagramElementType.CONNECTION;
  id: string;
  from: string;
  to: string;
  shape?: string | null;
  drawDirection?: string | null;
  fromDecoration: TerminatorJson;
  toDecoration: TerminatorJson;
  fromLabel?: LabelJson | null;
  toLabel?: LabelJson | null;
};

function isRectangular(e: DiagramElement): e is Rectangular {
  return "getContents" in e && typeof (e as Rectangular).getContents === "function";
}

function isConnection(e: DiagramElement): e is Connection {
  return e.getType() === DiagramElementType.CONNECTION;
}

function isLabel(e: DiagramElement): e is Label {
  return e.getType() === DiagramElementType.LABEL;
}

function isTerminator(e: DiagramElement): e is Terminator {
  return e.getType() === DiagramElementType.TERMINATOR;
}

function isPort(e: DiagramElement): boolean {
  return e.getType() === DiagramElementType.PORT;
}

function tagOf(e: DiagramElement): string {
  const el = (e as { el?: Element }).el;
  if (!el) return "unknown";
  const raw = el.localName || el.tagName || "unknown";
  return raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
}

function serializeTerminator(t: Terminator): TerminatorJson {
  const style =
    "getStyleName" in t && typeof (t as { getStyleName?: () => string }).getStyleName === "function"
      ? (t as { getStyleName: () => string }).getStyleName()
      : "NONE";
  return {
    type: DiagramElementType.TERMINATOR,
    id: t.getID(),
    end: String(t.getEnd()),
    style,
  };
}

function serializeLabel(l: Label): LabelJson {
  const text =
    "text" in l && typeof (l as { text?: () => string }).text === "function"
      ? (l as { text: () => string }).text()
      : "";
  return {
    type: DiagramElementType.LABEL,
    id: l.getID(),
    text,
    end: String(l.getEnd()),
  };
}

function serializeConnection(c: Connection): ConnectionJson {
  const shape =
    "getShape" in c && typeof (c as { getShape?: () => string | null }).getShape === "function"
      ? (c as { getShape: () => string | null }).getShape()
      : null;
  return {
    type: DiagramElementType.CONNECTION,
    id: c.getID(),
    from: c.getFrom().getID(),
    to: c.getTo().getID(),
    shape,
    drawDirection: c.getDrawDirection() != null ? String(c.getDrawDirection()) : null,
    fromDecoration: serializeTerminator(c.getFromDecoration()),
    toDecoration: serializeTerminator(c.getToDecoration()),
    fromLabel: c.getFromLabel() ? serializeLabel(c.getFromLabel()!) : null,
    toLabel: c.getToLabel() ? serializeLabel(c.getToLabel()!) : null,
  };
}

function serializeElement(e: DiagramElement): ModelJson {
  if (isConnection(e)) {
    return serializeConnection(e);
  }
  if (isLabel(e)) {
    return serializeLabel(e);
  }
  if (isPort(e)) {
    const port = e as unknown as { getPortDirection: () => string };
    return {
      type: DiagramElementType.PORT,
      id: e.getID(),
      direction: String(port.getPortDirection()),
    };
  }
  if (isTerminator(e)) {
    return serializeTerminator(e);
  }
  if (e.getType() === DiagramElementType.DIAGRAM || isRectangular(e)) {
    if (e.getType() === DiagramElementType.DIAGRAM) {
      // Nested diagrams are rare; treat like connected rectangular contents host.
    }
    const layout = isRectangular(e) ? e.getLayout() : null;
    const shape = (e as { el?: Element }).el?.getAttribute("shape") ?? null;
    return {
      type: DiagramElementType.CONNECTED_RECTANGULAR,
      id: e.getID(),
      tag: tagOf(e),
      shape,
      layout: layout != null ? String(layout) : null,
      gridColumns: isRectangular(e) ? e.getGridColumns() || undefined : undefined,
      gridRows: isRectangular(e) ? e.getGridRows() || undefined : undefined,
      contents: isRectangular(e)
        ? e
            .getContents()
            .filter((c) => !isConnection(c))
            .map(serializeElement)
        : [],
    };
  }
  return { type: e.getType(), id: e.getID() };
}

/** Stable JSON tree for a Diagram — used by tests and tooling. */
export function serializeDiagram(diagram: Diagram): DiagramJson {
  const contents = diagram.getContents();
  const connections = contents.filter(isConnection).map(serializeConnection);

  const known = new Set(connections.map((c) => c.id));
  for (const c of (diagram as Diagram & { allConnections?: Connection[] }).allConnections ??
    []) {
    if (!known.has(c.getID())) {
      connections.push(serializeConnection(c));
      known.add(c.getID());
    }
  }

  const viaRegistry: ConnectionJson[] = [];
  const seen = new Set<string>();
  const visitConnected = (e: DiagramElement): void => {
    if (isConnection(e)) return;
    if ("getLinks" in e) {
      for (const link of (e as Connected).getLinks()) {
        if (!seen.has(link.getID())) {
          seen.add(link.getID());
          viaRegistry.push(serializeConnection(link));
        }
      }
    }
    if (isRectangular(e)) {
      for (const child of e.getContents()) visitConnected(child);
    }
  };
  visitConnected(diagram);

  const connectionList = connections.length > 0 ? connections : viaRegistry;

  return {
    type: DiagramElementType.DIAGRAM,
    id: diagram.getID(),
    contents: contents.filter((c) => !isConnection(c)).map(serializeElement),
    connections: connectionList,
  };
}
