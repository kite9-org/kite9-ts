/**
 * Thorough XML fixtures.
 * old→new: Test37XMLFiles → generate(xml) cases
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLayoutHtml } from "../helpers/check-layout.js";
import { adlXmlToHtml } from "../helpers/adl-xml-to-html.js";

const xmlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/xml");

function loadXml(name: string): string {
  return adlXmlToHtml(readFileSync(path.join(xmlDir, name), "utf8"));
}

checkLayoutHtml("test_37_01_LibraryExample", loadXml("library1.xml"));

checkLayoutHtml("test_37_02_OverlapExample", loadXml("overlap.xml"));

checkLayoutHtml("test_37_03_Approaches1", loadXml("approaches1.xml"));

checkLayoutHtml("test_37_04_Approaches2", loadXml("approaches2.xml"));

checkLayoutHtml("test_37_05_Approaches3", loadXml("approaches3.xml"));

checkLayoutHtml("test_37_06_InAndOut", loadXml("in_and_out.xml"));

checkLayoutHtml("test_37_07_ServerError1", loadXml("server_error1.xml"));

checkLayoutHtml("test_37_08_Wonky", loadXml("wonky.xml"));

checkLayoutHtml("test_37_09_SlackOptimisationFailure", loadXml("so_failure.xml"));

checkLayoutHtml("test_37_10_NudgeFailure", loadXml("nudge_fail.xml"));

checkLayoutHtml("test_37_11_Sizings", loadXml("sizings.xml"));

checkLayoutHtml("test_37_12_GlyphTooBig", loadXml("glyph_too_big.xml"));

checkLayoutHtml("test_37_14_PlanarizationDependencyGraph", loadXml("planarizationDependencyGraph.xml"));

checkLayoutHtml("test_37_15_EdgeRouteProblem", loadXml("edge_route_problem.xml"));

checkLayoutHtml("test_37_16_WonkyRectangularization", loadXml("wonky_rect.xml"));

checkLayoutHtml("test_37_17_CantRouteEdge", loadXml("cant_route_edge.xml"));

checkLayoutHtml("test_37_18_ExcessBendIntroduced", loadXml("excess_bend_introduced.xml"));

checkLayoutHtml("test_37_20_LongLines", loadXml("long_lines.xml"));

checkLayoutHtml("test_37_21_SSPError", loadXml("ssp_error.xml"));

checkLayoutHtml("test_37_22_WiggleDistanceNotEqual", loadXml("wiggle_distance_not_equal.xml"));

checkLayoutHtml("test_37_26_SubContainersIssue", loadXml("sub_containers_issue.xml"));

checkLayoutHtml("test_37_27_SitingVertex", loadXml("siting_vertex.xml"));

checkLayoutHtml("test_37_28_CantRouteEdge2", loadXml("cant_route_edge_2.xml"));

checkLayoutHtml("test_37_29_CantRouteEdge3", loadXml("cant_route_edge_3.xml"));

checkLayoutHtml("test_37_30_CantRouteEdge4", loadXml("cant_route_edge_4.xml"));

checkLayoutHtml("test_37_31_WrongDirection", loadXml("wrong_direction.xml"));

checkLayoutHtml("test_37_32_WrongDirection2", loadXml("wrong_direction_2.xml"));

checkLayoutHtml("test_37_33_DirectionalConstraintsIssue", loadXml("directional_constraints_issue.xml"));

checkLayoutHtml("test_37_34_BrokenContainerFlow", loadXml("broken_container_flow.xml"));

checkLayoutHtml("test_37_35_MisplacedGlyph", loadXml("misplaced_glyph.xml"));

checkLayoutHtml("test_37_36_NoFurtherPathPositionRouter", loadXml("no_further_path_position_router.xml"));

checkLayoutHtml("test_37_37_BrokenDartFace", loadXml("broken_dart_face.xml"));

checkLayoutHtml("test_37_38_BadSpacing_2", loadXml("bad_spacing_2.xml"));

checkLayoutHtml("test_37_39_BadSpacing", loadXml("bad_spacing.xml"));

checkLayoutHtml("test_37_40_ADLClassHierarchyLayouts", loadXml("ADLClassHierarchyLayouts.xml"));
