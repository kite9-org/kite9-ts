/**
 * LEMMA: if the user provides a set of directed edges which don't overlap,
 * we will always provide the optimal arrangement of the edges.
 * old→new: Java Test22 (DirectedEdgeInsertion) → test_32_* (renumbered to avoid display clash)
 */
import { checkLayout } from "../helpers/check-layout.js";
import { createGrid } from "../helpers/graph-construction.js";
import { link } from "../helpers/link.js";

checkLayout("test_32_01_UnconnectedWindows", (() => {
  const a = createGrid("a", 2, 2, true);
  const b = createGrid("b", 2, 2, true);
  return (
    <kite9-diagram id="D">
      {a.elements}
      {b.elements}
      {a.links}
      {b.links}
    </kite9-diagram>
  );
})());

checkLayout("test_32_02_NextToWindows", (() => {
  const a = createGrid("a", 2, 2, true);
  const b = createGrid("b", 2, 2, true);
  return (
    <kite9-diagram id="D">
      {a.elements}
      {b.elements}
      {a.links}
      {b.links}
      {link("x1", a.glyphIds[1]![1]!, b.glyphIds[0]![0]!, {
        drawDirection: "right",
      })}
    </kite9-diagram>
  );
})());

checkLayout("test_32_03_EmbeddedToWindows", (() => {
  const a = createGrid("a", 2, 2, true);
  const b = createGrid("b", 2, 2, true);
  return (
    <kite9-diagram id="D">
      {a.elements}
      {b.elements}
      {a.links}
      {b.links}
      {link("x1", a.glyphIds[0]![0]!, b.glyphIds[0]![0]!, {
        drawDirection: "right",
      })}
      {link("x2", b.glyphIds[1]![1]!, a.glyphIds[1]![1]!, {
        drawDirection: "right",
      })}
    </kite9-diagram>
  );
})());

checkLayout(
  "test_32_04_javaArchitecture2Broken",
  <kite9-diagram id="Arch">
    <kite9-container id="yours" label="Your Server / PC">
      <kite9-arrow id="converts" label="converts" />
      <kite9-glyph
        id="client"
        stereotype="client side"
        label="Kite9 Java Tool"
      >
        <kite9-text-line id="client-t1" label="(or another tool)" />
      </kite9-glyph>
      <kite9-glyph id="xstream" label="XStream" />
      <kite9-glyph id="objects" stereotype="java objects" label="ADL Model" />
    </kite9-container>
    <kite9-container id="Over the wire" layout="DOWN" label="HTTP Over Internet">
      <kite9-glyph
        id="diagram"
        stereotype="xml"
        label="A Diagram Definition"
      />
      <kite9-arrow id="sends" label="sends" />
      <kite9-arrow id="receives" label="receives" />
      <kite9-glyph id="response" stereotype="zip file" label="Response">
        <kite9-text-line id="response-t1" label="PNG Image (or) " />
        <kite9-text-line id="response-t2" label="PDF Image" />
        <kite9-text-line id="response-t3" label="Client-side image map" />
      </kite9-glyph>
    </kite9-container>
    <kite9-container id="ours" label="Kite9 Servers">
      <kite9-glyph
        id="diagramServer"
        stereotype="web-app"
        label="Kite9 Diagram Server"
      />
    </kite9-container>
    {link("l1", "converts", "client")}
    {link("l2", "converts", "xstream", { toLabel: "using" })}
    {link("l3", "converts", "objects")}
    {link("l4", "client", "sends", { drawDirection: "right" })}
    {link("l5", "sends", "diagramServer", {
      toDecoration: "ARROW",
      drawDirection: "right",
    })}
    {link("l6", "sends", "diagram")}
    {link("l7", "diagramServer", "receives", { drawDirection: "left" })}
    {link("l8", "receives", "client", {
      toDecoration: "ARROW",
      drawDirection: "left",
    })}
    {link("l9", "receives", "response")}
  </kite9-diagram>,
);

checkLayout(
  "test_32_05_MultipleEdgeInsertion1",
  <kite9-diagram id="Arch">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    {link("l1", "a", "b", { drawDirection: "down" })}
    {link("l2", "a", "b")}
    {link("l3", "a", "b")}
    {link("l4", "a", "b")}
    {link("l5", "a", "b")}
    {link("l6", "a", "b")}
  </kite9-diagram>,
);

checkLayout(
  "test_32_06_MultipleEdgeInsertion2",
  <kite9-diagram id="Arch">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-glyph id="c" label="c" />
    {link("l1", "a", "b", { drawDirection: "down" })}
    {link("l2", "a", "c", { drawDirection: "down" })}
    {link("l3", "a", "b")}
    {link("l4", "a", "c")}
    {link("l5", "a", "b")}
    {link("l6", "c", "b", { drawDirection: "up" })}
  </kite9-diagram>,
);
