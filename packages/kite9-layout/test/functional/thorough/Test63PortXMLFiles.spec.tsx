/**
 * Thorough HTML fixtures (converted from Java Test63PortXMLFiles ADL XML).
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
  "test_63_01_WeirdPortRouting",
  loadHtml("weird_port_routing.html"),
);
