/**
 * Planarization problems.
 * old→new: Test48PlanarizationProblems → test_48_01
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_48_01_PavingProblem",
  <kite9-diagram id="dia">
    <kite9-glyph id="h1" label="h1" />
    <kite9-glyph id="o2" label="o2" />
    <kite9-glyph id="v3" label="v3" />
    <kite9-glyph id="h4" label="h4" />
    <kite9-glyph id="v5" label="v5" />
    <kite9-glyph id="h6" label="h6" />
    <kite9-glyph id="v7" label="v7" />
    <kite9-glyph id="o8" label="o8" />
    <kite9-glyph id="v9" label="v9" />
    <kite9-glyph id="h10" label="h10" />
    <kite9-glyph id="o11" label="o11" />
    {link("r1", "h1", "o2", { drawDirection: "right" })}
    {link("r2", "o2", "v3", { drawDirection: "right" })}
    {link("r3", "v3", "h4", { drawDirection: "right" })}
    {link("r4", "v5", "h6", { drawDirection: "right" })}
    {link("r5", "h6", "v3", { drawDirection: "right" })}
    {link("r6", "v3", "v7", { drawDirection: "right" })}
    {link("r7", "v7", "o8", { drawDirection: "right" })}
    {link("r8", "v5", "v9", { drawDirection: "right" })}
    {link("r9", "v9", "h10", { drawDirection: "right" })}
    {link("r10", "h10", "v7", { drawDirection: "right" })}
    {link("r11", "o11", "v9", { drawDirection: "right" })}
    {link("d1", "h1", "v5", { drawDirection: "down" })}
    {link("d2", "h1", "h6", { drawDirection: "down" })}
    {link("d3", "v5", "o11", { drawDirection: "down" })}
    {link("d4", "o2", "h6", { drawDirection: "down" })}
    {link("d5", "h6", "v9", { drawDirection: "down" })}
    {link("d6", "h6", "h10", { drawDirection: "down" })}
    {link("d7", "v3", "h10", { drawDirection: "down" })}
    {link("d8", "h4", "v7", { drawDirection: "down" })}
    {link("d9", "h4", "o8", { drawDirection: "down" })}
  </kite9-diagram>,
  { skip: "Java test is @NotAddressed (known planarization failure)" },
);
