/** Place connections onto a track graph and return inflated LayoutData. */

import {
  DiagramElementType,
  type Connected,
  type Connection,
  type Diagram,
  type DiagramElement,
  type LayoutData,
  type Port,
} from "@kite9/model";
import { Direction } from "@kite9/model";
import {
  inflateLayout,
  DEFAULT_LANE_PX,
  type RoutedConnection,
  type SeamRemap,
} from "./inflate.js";
import { markTracksUsed, shortestPath } from "./routing/ssp.js";
import {
  buildTrackGraph,
  hubsOnRectangular,
  type HubTerminal,
  type TrackGraph,
} from "./track-graph.js";

function isConnection(de: DiagramElement): de is Connection {
  return de.getType() === DiagramElementType.CONNECTION;
}

function isPort(de: DiagramElement): de is Port {
  return de.getType() === DiagramElementType.PORT;
}

function collectConnections(diagram: Diagram): Connection[] {
  const out: Connection[] = [];
  const walk = (el: DiagramElement) => {
    if (isConnection(el)) out.push(el);
    const contents = (el as { getContents?: () => readonly DiagramElement[] })
      .getContents?.();
    if (contents) for (const c of contents) walk(c);
  };
  walk(diagram);
  return out;
}

function terminalsForConnected(
  graph: TrackGraph,
  c: Connected,
): HubTerminal[] {
  if (isPort(c)) {
    const parent = c.getParent();
    const rect = graph.rects.get(parent.getID());
    if (!rect) return [];
    const edge = c.getPortDirection();
    const hubs = hubsOnRectangular(graph, rect).filter((h) => h.edge === edge);
    // Re-id as the port id so routes reference the real port
    return hubs.map((h) => ({ ...h, id: c.getID(), onId: parent.getID() }));
  }
  const rect = graph.rects.get(c.getID());
  if (!rect) return [];
  return hubsOnRectangular(graph, rect);
}

function lanePxFor(connection: Connection): number {
  let need = DEFAULT_LANE_PX;
  for (const d of [
    Direction.UP,
    Direction.DOWN,
    Direction.LEFT,
    Direction.RIGHT,
  ]) {
    need = Math.max(need, connection.getMargin(d) || 0);
    need = Math.max(need, connection.getPadding(d) || 0);
  }
  const from = connection.getFrom();
  const to = connection.getTo();
  const gutters = [from, to].map((e) => {
    const g = e as unknown as { getLinkGutter?: () => number };
    return typeof g.getLinkGutter === "function" ? g.getLinkGutter() : 0;
  });
  need = Math.max(need, ...gutters, DEFAULT_LANE_PX);
  return need;
}

export type RouteConnectionsResult = {
  layout: LayoutData;
  graph: TrackGraph;
  /** Pre-inflate seam → inflated edge / pixel (for debug draw). */
  remap: SeamRemap;
};

/**
 * Route all diagram connections over tracks derived from `layout`, then
 * inflate used lanes into the grid. Deep-clones via inflate; input is not mutated.
 */
export function routeConnections(
  diagram: Diagram,
  layout: LayoutData,
): LayoutData {
  return routeConnectionsWithGraph(diagram, layout).layout;
}

/** Same as {@link routeConnections}, also returns the track graph (for debug PNG). */
export function routeConnectionsWithGraph(
  diagram: Diagram,
  layout: LayoutData,
): RouteConnectionsResult {
  const cloned = JSON.parse(JSON.stringify(layout)) as LayoutData;
  const graph = buildTrackGraph(diagram, cloned);
  const routed: RoutedConnection[] = [];

  for (const conn of collectConnections(diagram)) {
    const starts = terminalsForConnected(graph, conn.getFrom());
    const ends = terminalsForConnected(graph, conn.getTo());
    const path = shortestPath(starts, ends);
    if (!path) continue;
    markTracksUsed(path.steps, conn.getID());
    routed.push({
      id: conn.getID(),
      start: path.start,
      end: path.end,
      steps: path.steps,
      lanePx: lanePxFor(conn),
    });
  }

  const inflated = inflateLayout(graph, routed);
  return { layout: inflated.layout, graph, remap: inflated.remap };
}
