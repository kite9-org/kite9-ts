/**
 * Thorough XML fixtures.
 * old→new: Test38XMLFilesNew → generate(xml) cases
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

checkLayoutHtml("test_38_01_CantFinishGrouping", loadXml("cant_finish_grouping.xml"));

checkLayoutHtml("test_38_02_ADClassDiagram", loadXml("diagramClassHierarchy.xml"));

checkLayoutHtml("test_38_03_ContainerGoesWrong", loadXml("container_goes_wrong.xml"));

checkLayoutHtml("test_38_04_OverlapIssue", loadXml("layout_issue_planarization_diagram.xml"));

checkLayoutHtml("test_38_05_DuplicateFieldException", loadXml("duplicate_field_exception.xml"));

checkLayoutHtml("test_38_06_EasyCrash", loadXml("easy_crash.xml"));

checkLayoutHtml("test_38_07_ContainerLayoutProblem", loadXml("container_layout_problem.xml"));

checkLayoutHtml("test_38_08_ContainerLayoutProblem2", loadXml("container_layout_problem_2.xml"));

checkLayoutHtml("test_38_09_CantRouteEdge5", loadXml("cant_route_edge_5.xml"));

checkLayoutHtml("test_38_10_CantComplete", loadXml("cant_complete.xml"));

checkLayoutHtml("test_38_11_SizingLayout", loadXml("sizing_layout.xml"));

checkLayoutHtml("test_38_12_AlignedMergeInDirectedContainer", loadXml("aligned_merge_in_directed_container.xml"));

checkLayoutHtml("test_38_13_TextLineFiasco", loadXml("text_line_fiasco.xml"));

checkLayoutHtml("test_38_14_StackOverflow", loadXml("stack_overflow.xml"));

checkLayoutHtml("test_38_15_UnnecessaryBend", loadXml("unnecessary_bend.xml"));

checkLayoutHtml("test_38_16_AlignedMergeInDirectedContainer2", loadXml("aligned_merge_in_directed_container2.xml"));

checkLayoutHtml("test_38_17_NoSuchElementException2", loadXml("no_such_element_exception2.xml"));

checkLayoutHtml("test_38_18_OuterFace", loadXml("outer_face.xml"));

checkLayoutHtml("test_38_19_CantCompleteOrth", loadXml("cant_complete_orth.xml"));

checkLayoutHtml("test_38_21_LongWayRound", loadXml("long_way_round.xml"));

checkLayoutHtml("test_38_22_LongLine", loadXml("long_line.xml"));

checkLayoutHtml("test_38_23_UnnecessaryContradiction", loadXml("unnecessary_contradiction.xml"));

checkLayoutHtml("test_38_24_WonkyCompaction", loadXml("wonky_compaction.xml"));

checkLayoutHtml("test_38_25_AnotherContradiction", loadXml("another_contradiction_issue.xml"));

checkLayoutHtml("test_38_27_CantComplete", loadXml("cant_complete2.xml"));

checkLayoutHtml("test_38_28_SimpleBreak", loadXml("simple_break.xml"));

checkLayoutHtml("test_38_29_Lopsided", loadXml("lopsided.xml"));

checkLayoutHtml("test_38_30_UseCaseDrawing", loadXml("use_case_drawing.xml"));

checkLayoutHtml("test_38_31_NoPointArrow", loadXml("no_point_arrow.xml"));

checkLayoutHtml("test_38_33_ContainerWrongShape", loadXml("container_wrong_shape.xml"));

checkLayoutHtml("test_38_34_ContainerLayoutError", loadXml("container_layout_error.xml"));

checkLayoutHtml("test_38_35_NonCenteredKey", loadXml("NonCenteredKey.xml"));

checkLayoutHtml("test_38_36_KeyError", loadXml("key_error.xml"));
