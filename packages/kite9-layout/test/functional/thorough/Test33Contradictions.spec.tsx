/**
 * Thorough XML fixtures.
 * old→new: Test33Contradictions → generate(xml) cases
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

checkLayoutHtml("test_33_15_TooManyContradictions", loadXml("too_many_contradictions.xml"));

checkLayoutHtml("test_33_21_BadRequest", loadXml("badrequest.xml"));

checkLayoutHtml("test_33_22_BretsError", loadXml("brets_error.xml"));

checkLayoutHtml("test_33_23_BentContainer", loadXml("bent_container.xml"));

checkLayoutHtml("test_33_27_30KElements", loadXml("30k.xml"));

checkLayoutHtml("test_33_30_ADLHierarchy", loadXml("ADLClassHierarchy.xml"));

checkLayoutHtml("test_33_31_ADLHierarchyNoBorder", loadXml("ADLClassHierarchyNoBorder.xml"));

checkLayoutHtml("test_33_32_ADLHierarchyStrictNoBorder", loadXml("ContradictingADLClassHierarchyNoBorder.xml"));

checkLayoutHtml("test_33_33_LayoutDirection", loadXml("layout_direction.xml"));

checkLayoutHtml("test_33_34_CouldntEstablishDirection", loadXml("couldnt_establish_direction.xml"));
