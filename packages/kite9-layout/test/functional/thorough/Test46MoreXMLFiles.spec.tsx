/**
 * Thorough XML fixtures.
 * old→new: Test46MoreXMLFiles → generate(xml) cases
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

checkLayoutHtml("test_46_01_CantComplete", loadXml("46_1.xml"));

checkLayoutHtml("test_46_02_UnnecessaryContradiction", loadXml("46_2.xml"));

checkLayoutHtml("test_46_03_ServerError", loadXml("46_3.xml"));

checkLayoutHtml("test_46_04_FailsToDraw", loadXml("46_4.xml"));

checkLayoutHtml("test_46_05_FailsToDraw", loadXml("46_5.xml"));

checkLayoutHtml("test_46_06_Overlap2", loadXml("overlap_2.xml"));

checkLayoutHtml("test_46_07_BrokenContainer", loadXml("46_7.xml"));

checkLayoutHtml("test_46_08_ContentOverlap", loadXml("content_overlap.xml"));

checkLayoutHtml("test_46_09_4Turns", loadXml("4turns.xml"));

checkLayoutHtml("test_46_10_PushingRect", loadXml("label_push_error.xml"));

checkLayoutHtml("test_46_11_OddPortClash", loadXml("odd_port_clash.xml"));

checkLayoutHtml("test_46_12_UnnecessaryDogleg", loadXml("dogleg.xml"));

checkLayoutHtml("test_46_14_PortException", loadXml("port_exception.xml"));

checkLayoutHtml("test_46_15_WonkyTable", loadXml("wonky_table.xml"));

checkLayoutHtml("test_46_16_GridProblem", loadXml("broken_grid.xml"));

checkLayoutHtml("test_46_16_GridProblem2", loadXml("broken_grid2.xml"));
