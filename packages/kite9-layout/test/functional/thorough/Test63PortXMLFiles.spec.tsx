/**
 * Thorough XML fixtures.
 * old→new: Test63PortXMLFiles → generate(xml) cases
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

checkLayoutHtml("test_63_01_WeirdPortRouting", loadXml("weird_port_routing.xml"));
