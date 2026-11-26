/**
 * Thorough HTML fixtures (converted from Java Test33Contradictions ADL XML).
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
  "test_33_15_TooManyContradictions",
  loadHtml("too_many_contradictions.html"),
);

checkLayoutHtml("test_33_21_BadRequest", loadHtml("badrequest.html"));

checkLayoutHtml("test_33_22_BretsError", loadHtml("brets_error.html"));

checkLayoutHtml("test_33_23_BentContainer", loadHtml("bent_container.html"));

checkLayoutHtml("test_33_27_30KElements", loadHtml("30k.html"));

checkLayoutHtml("test_33_30_ADLHierarchy", loadHtml("ADLClassHierarchy.html"));

checkLayoutHtml(
  "test_33_31_ADLHierarchyNoBorder",
  loadHtml("ADLClassHierarchyNoBorder.html"),
);

checkLayoutHtml(
  "test_33_32_ADLHierarchyStrictNoBorder",
  loadHtml("ContradictingADLClassHierarchyNoBorder.html"),
);

checkLayoutHtml("test_33_33_LayoutDirection", loadHtml("layout_direction.html"));

checkLayoutHtml(
  "test_33_34_CouldntEstablishDirection",
  loadHtml("couldnt_establish_direction.html"),
);
