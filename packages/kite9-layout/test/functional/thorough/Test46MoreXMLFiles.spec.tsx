/**
 * Thorough HTML fixtures (converted from Java Test46MoreXMLFiles ADL XML).
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

checkLayoutHtml("test_46_01_CantComplete", loadHtml("46_1.html"));

checkLayoutHtml("test_46_02_UnnecessaryContradiction", loadHtml("46_2.html"));

checkLayoutHtml("test_46_03_ServerError", loadHtml("46_3.html"));

checkLayoutHtml("test_46_04_FailsToDraw", loadHtml("46_4.html"));

checkLayoutHtml("test_46_05_FailsToDraw", loadHtml("46_5.html"));

checkLayoutHtml("test_46_06_Overlap2", loadHtml("overlap_2.html"));

checkLayoutHtml("test_46_07_BrokenContainer", loadHtml("46_7.html"));

checkLayoutHtml("test_46_08_ContentOverlap", loadHtml("content_overlap.html"));

checkLayoutHtml("test_46_09_4Turns", loadHtml("4turns.html"));

checkLayoutHtml("test_46_10_PushingRect", loadHtml("label_push_error.html"));

checkLayoutHtml("test_46_11_OddPortClash", loadHtml("odd_port_clash.html"));

checkLayoutHtml("test_46_12_UnnecessaryDogleg", loadHtml("dogleg.html"));

checkLayoutHtml("test_46_14_PortException", loadHtml("port_exception.html"));

checkLayoutHtml("test_46_15_WonkyTable", loadHtml("wonky_table.html"));

checkLayoutHtml("test_46_16_GridProblem", loadHtml("broken_grid.html"));

checkLayoutHtml("test_46_16_GridProblem2", loadHtml("broken_grid2.html"));
