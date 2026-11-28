export {
  routeConnections,
  routeConnectionsWithGraph,
  type RouteConnectionsResult,
} from "./route-connections.js";
export {
  buildTrackGraph,
  hubsOnRectangular,
  createHub,
  hubId,
  cellPixelRect,
  wireIntersectionNeighbours,
  propagateStubs,
  intersectOrthogonalPropagatedStubs,
  linkColocatedStubJunctions,
  type Track,
  type TrackGraph,
  type TrackSegment,
  type Intersection,
  type HubTerminal,
  type TrackAxis,
  type TrackKind,
} from "./track-graph.js";
export {
  inflateLayout,
  DEFAULT_LANE_PX,
  type RoutedConnection,
  type SeamRemap,
  type InflateResult,
} from "./inflate.js";
export { shortestPath, markTracksUsed, type RouteStep } from "./routing/ssp.js";
export {
  buildTraversalTables,
  canTraverseHorizontal,
  canTraverseVertical,
  indexRectangulars,
  type TraversalTables,
} from "./traversal-tables.js";
