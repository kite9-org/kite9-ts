/**
 * Thorough HTML fixtures (converted from Java Test37XMLFiles ADL XML).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLayoutHtml } from "../helpers/check-layout.js";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

function loadHtml(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf8");
}

checkLayoutHtml("test_37_01_LibraryExample", loadHtml("library1.html"));

checkLayoutHtml("test_37_02_OverlapExample", loadHtml("overlap.html"));

checkLayoutHtml("test_37_03_Approaches1", loadHtml("approaches1.html"));

checkLayoutHtml("test_37_04_Approaches2", loadHtml("approaches2.html"));

checkLayoutHtml("test_37_05_Approaches3", loadHtml("approaches3.html"));

checkLayoutHtml("test_37_06_InAndOut", loadHtml("in_and_out.html"));

checkLayoutHtml("test_37_07_ServerError1", loadHtml("server_error1.html"));

checkLayoutHtml("test_37_08_Wonky", loadHtml("wonky.html"));

checkLayoutHtml("test_37_09_SlackOptimisationFailure", loadHtml("so_failure.html"));

checkLayoutHtml("test_37_10_NudgeFailure", loadHtml("nudge_fail.html"));

checkLayoutHtml("test_37_11_Sizings", loadHtml("sizings.html"));

checkLayoutHtml("test_37_12_GlyphTooBig", loadHtml("glyph_too_big.html"));

checkLayoutHtml(
  "test_37_14_PlanarizationDependencyGraph",
  loadHtml("planarizationDependencyGraph.html"),
);

checkLayoutHtml("test_37_15_EdgeRouteProblem", loadHtml("edge_route_problem.html"));

checkLayoutHtml("test_37_16_WonkyRectangularization", loadHtml("wonky_rect.html"));

checkLayoutHtml("test_37_17_CantRouteEdge", loadHtml("cant_route_edge.html"));

checkLayoutHtml(
  "test_37_18_ExcessBendIntroduced",
  loadHtml("excess_bend_introduced.html"),
);

checkLayoutHtml("test_37_20_LongLines", loadHtml("long_lines.html"));

checkLayoutHtml("test_37_21_SSPError", loadHtml("ssp_error.html"));

checkLayoutHtml(
  "test_37_22_WiggleDistanceNotEqual",
  loadHtml("wiggle_distance_not_equal.html"),
);

checkLayoutHtml(
  "test_37_26_SubContainersIssue",
  loadHtml("sub_containers_issue.html"),
);

checkLayoutHtml("test_37_27_SitingVertex", loadHtml("siting_vertex.html"));

checkLayoutHtml("test_37_28_CantRouteEdge2", loadHtml("cant_route_edge_2.html"));

checkLayoutHtml("test_37_29_CantRouteEdge3", loadHtml("cant_route_edge_3.html"));

checkLayoutHtml("test_37_30_CantRouteEdge4", loadHtml("cant_route_edge_4.html"));

checkLayoutHtml("test_37_31_WrongDirection", loadHtml("wrong_direction.html"));

checkLayoutHtml("test_37_32_WrongDirection2", loadHtml("wrong_direction_2.html"));

checkLayoutHtml(
  "test_37_33_DirectionalConstraintsIssue",
  loadHtml("directional_constraints_issue.html"),
);

checkLayoutHtml(
  "test_37_34_BrokenContainerFlow",
  loadHtml("broken_container_flow.html"),
);

checkLayoutHtml("test_37_35_MisplacedGlyph", loadHtml("misplaced_glyph.html"));

checkLayoutHtml(
  "test_37_36_NoFurtherPathPositionRouter",
  loadHtml("no_further_path_position_router.html"),
);

checkLayoutHtml("test_37_37_BrokenDartFace", loadHtml("broken_dart_face.html"));

checkLayoutHtml("test_37_38_BadSpacing_2", loadHtml("bad_spacing_2.html"));

checkLayoutHtml("test_37_39_BadSpacing", loadHtml("bad_spacing.html"));

checkLayoutHtml(
  "test_37_40_ADLClassHierarchyLayouts",
  loadHtml("ADLClassHierarchyLayouts.html"),
);
