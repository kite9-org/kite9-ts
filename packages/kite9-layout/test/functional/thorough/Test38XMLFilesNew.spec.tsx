/**
 * Thorough HTML fixtures (converted from Java Test38XMLFilesNew ADL XML).
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

checkLayoutHtml(
  "test_38_01_CantFinishGrouping",
  loadHtml("cant_finish_grouping.html"),
);

checkLayoutHtml("test_38_02_ADClassDiagram", loadHtml("diagramClassHierarchy.html"));

checkLayoutHtml(
  "test_38_03_ContainerGoesWrong",
  loadHtml("container_goes_wrong.html"),
);

checkLayoutHtml(
  "test_38_04_OverlapIssue",
  loadHtml("layout_issue_planarization_diagram.html"),
);

checkLayoutHtml(
  "test_38_05_DuplicateFieldException",
  loadHtml("duplicate_field_exception.html"),
);

checkLayoutHtml("test_38_06_EasyCrash", loadHtml("easy_crash.html"));

checkLayoutHtml(
  "test_38_07_ContainerLayoutProblem",
  loadHtml("container_layout_problem.html"),
);

checkLayoutHtml(
  "test_38_08_ContainerLayoutProblem2",
  loadHtml("container_layout_problem_2.html"),
);

checkLayoutHtml("test_38_09_CantRouteEdge5", loadHtml("cant_route_edge_5.html"));

checkLayoutHtml("test_38_10_CantComplete", loadHtml("cant_complete.html"));

checkLayoutHtml("test_38_11_SizingLayout", loadHtml("sizing_layout.html"));

checkLayoutHtml(
  "test_38_12_AlignedMergeInDirectedContainer",
  loadHtml("aligned_merge_in_directed_container.html"),
);

checkLayoutHtml("test_38_13_TextLineFiasco", loadHtml("text_line_fiasco.html"));

checkLayoutHtml("test_38_14_StackOverflow", loadHtml("stack_overflow.html"));

checkLayoutHtml("test_38_15_UnnecessaryBend", loadHtml("unnecessary_bend.html"));

checkLayoutHtml(
  "test_38_16_AlignedMergeInDirectedContainer2",
  loadHtml("aligned_merge_in_directed_container2.html"),
);

checkLayoutHtml(
  "test_38_17_NoSuchElementException2",
  loadHtml("no_such_element_exception2.html"),
);

checkLayoutHtml("test_38_18_OuterFace", loadHtml("outer_face.html"));

checkLayoutHtml("test_38_19_CantCompleteOrth", loadHtml("cant_complete_orth.html"));

checkLayoutHtml("test_38_21_LongWayRound", loadHtml("long_way_round.html"));

checkLayoutHtml("test_38_22_LongLine", loadHtml("long_line.html"));

checkLayoutHtml(
  "test_38_23_UnnecessaryContradiction",
  loadHtml("unnecessary_contradiction.html"),
);

checkLayoutHtml("test_38_24_WonkyCompaction", loadHtml("wonky_compaction.html"));

checkLayoutHtml(
  "test_38_25_AnotherContradiction",
  loadHtml("another_contradiction_issue.html"),
);

checkLayoutHtml("test_38_27_CantComplete", loadHtml("cant_complete2.html"));

checkLayoutHtml("test_38_28_SimpleBreak", loadHtml("simple_break.html"));

checkLayoutHtml("test_38_29_Lopsided", loadHtml("lopsided.html"));

checkLayoutHtml("test_38_30_UseCaseDrawing", loadHtml("use_case_drawing.html"));

checkLayoutHtml("test_38_31_NoPointArrow", loadHtml("no_point_arrow.html"));

checkLayoutHtml(
  "test_38_33_ContainerWrongShape",
  loadHtml("container_wrong_shape.html"),
);

checkLayoutHtml(
  "test_38_34_ContainerLayoutError",
  loadHtml("container_layout_error.html"),
);

checkLayoutHtml("test_38_35_NonCenteredKey", loadHtml("NonCenteredKey.html"));

checkLayoutHtml("test_38_36_KeyError", loadHtml("key_error.html"));
