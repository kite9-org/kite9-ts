import { describe, expect, it } from "vitest";
import {
  AdlMoveCells,
  Delete,
  InsertHtml,
  InsertUrl,
  InsertUrlWithChanges,
  Move,
  ReplaceAttr,
  ReplaceHtml,
  ReplaceStyle,
  ReplaceTag,
  ReplaceTagUrl,
  ReplaceText,
  PreserveChildElements,
  diagramRootFromHtml,
  rootsStructurallyEqual,
} from "../src/index.js";
import {
  b64,
  expectNoMismatch,
  FIXTURE_URI_1,
  FIXTURE_URI_2,
  loadContext,
  testDoAndUndo,
} from "./helpers.js";

describe("commands do/undo", () => {
  it("ReplaceHtml", () => {
    const replace = new ReplaceHtml();
    replace.fragmentId = "The Diagram";
    replace.from = b64(`<diagram id="The Diagram">
    <glyph id="one">
      <label id="one-label">One</label>
    </glyph>
    <glyph id="two">
      <label id="two-label">Two</label>
    </glyph>
    <kite9-link id="link" rank="4">
      <from reference="one" id="link-from"></from>
      <to class="arrow" reference="two" id="link-to"></to>
    </kite9-link>
  </diagram>`);
    replace.to = b64(`<lets id="The Diagram"><do>some</do>replacing</lets>`);
    testDoAndUndo(replace, "replaceXML");
  });

  it("ReplaceTag", () => {
    const replace = new ReplaceTag();
    replace.fragmentId = "link";
    replace.from = b64(`<kite9-link id="link" rank="4"></kite9-link>`);
    replace.to = b64(
      `<glyph id="The Diagram" style="raw: fish"></glyph>`,
    );
    replace.keptAttributes = ["rank", "id", "style"];
    testDoAndUndo(replace, "replaceTag");
  });

  it("ReplaceTagUrl", () => {
    const replace = new ReplaceTagUrl();
    replace.fragmentId = "link";
    replace.from = b64(`<kite9-link id="link" rank="4"></kite9-link>`);
    replace.to = `${FIXTURE_URI_1}#one`;
    replace.keptAttributes = ["rank", "id"];
    testDoAndUndo(replace, "replaceTagUrl");
  });

  it("Move", () => {
    const move = new Move();
    move.moveId = "one-label";
    move.to = "two";
    move.from = "one";
    move.toBefore = "two-label";
    testDoAndUndo(move, "move");
  });

  it("AdlMoveCells", () => {
    const move = new AdlMoveCells();
    move.fragmentId = "table1";
    move.horiz = true;
    move.from = 1;
    move.push = 3;
    testDoAndUndo(move, "adlMoveCells", "test_command2.html", FIXTURE_URI_2);
  });

  it("AdlMoveCells with excludedIds", () => {
    const move = new AdlMoveCells();
    move.fragmentId = "table1";
    move.horiz = true;
    move.from = 1;
    move.push = 3;
    move.excludedIds = ["t3"];
    testDoAndUndo(move, "adlMoveCells2", "test_command2.html", FIXTURE_URI_2);
  });

  it("ReplaceText AFTER", () => {
    const setText = new ReplaceText();
    setText.to = "Winner";
    setText.from = "";
    setText.fragmentId = "two";
    setText.preserve = PreserveChildElements.AFTER;
    testDoAndUndo(setText, "replaceText1");
  });

  it("ReplaceText NONE", () => {
    const setText = new ReplaceText();
    setText.to = "Winner";
    setText.from = "Two";
    setText.fragmentId = "two-label";
    setText.preserve = PreserveChildElements.NONE;
    testDoAndUndo(setText, "replaceText2");
  });

  it("ReplaceAttr", () => {
    const setAttr = new ReplaceAttr();
    setAttr.name = "name";
    setAttr.to = "value";
    setAttr.fragmentId = "two";
    testDoAndUndo(setAttr, "replaceAttr");
  });

  it("ReplaceAttr style", () => {
    const setAttr = new ReplaceAttr();
    setAttr.name = "style";
    setAttr.to = "value";
    setAttr.fragmentId = "two";
    testDoAndUndo(setAttr, "replaceAttr2");
  });

  it("ReplaceStyle", () => {
    const setStyle = new ReplaceStyle();
    setStyle.name = "stroke";
    setStyle.to = "red";
    setStyle.fragmentId = "two";
    testDoAndUndo(setStyle, "replaceStyle");
  });

  it("ReplaceStyle complex value", () => {
    const setStyle = new ReplaceStyle();
    setStyle.name = "stroke";
    setStyle.to = "single back() border 1.5em";
    setStyle.fragmentId = "two";
    testDoAndUndo(setStyle, "replaceStyle2");
  });

  it("Delete with containedIds", () => {
    const del = new Delete();
    del.fragmentId = "The Diagram";
    del.beforeId = "two";
    del.base64Element = b64(`<glyph id="one">
      <label id="one-label">One</label>
    </glyph>`);
    del.containedIds = ["one-label"];
    testDoAndUndo(del, "delete");
  });

  it("Delete all", () => {
    const del = new Delete();
    del.fragmentId = "The Diagram";
    del.beforeId = "two";
    del.base64Element = b64(`<glyph id="one">
      <label id="one-label">One</label>
    </glyph>`);
    testDoAndUndo(del, "deleteAll");
  });

  it("InsertHtml", () => {
    const copy = new InsertHtml();
    copy.base64Element = b64(`<some id="seven"><xml>goes</xml>here</some>`);
    copy.fragmentId = "The Diagram";
    copy.beforeId = "two";
    testDoAndUndo(copy, "insertXML1");
  });

  it("InsertHtml with containedIds", () => {
    const copy = new InsertHtml();
    copy.base64Element = b64(
      `<some id="seven"><xml id="ig">goes</xml>here</some>`,
    );
    copy.fragmentId = "The Diagram";
    copy.beforeId = "two";
    copy.containedIds = ["ig"];
    testDoAndUndo(copy, "insertXML2");
  });

  it("InsertUrl", () => {
    const copy = new InsertUrl();
    copy.uriStr = `${FIXTURE_URI_1}#one`;
    copy.fragmentId = "The Diagram";
    copy.newId = "six";
    testDoAndUndo(copy, "insertUrl");
  });

  it("InsertUrl with containedIds", () => {
    const copy = new InsertUrl();
    copy.uriStr = `${FIXTURE_URI_1}#two`;
    copy.fragmentId = "The Diagram";
    copy.newId = "six";
    copy.containedIds = ["two"];
    copy.beforeId = "link";
    testDoAndUndo(copy, "insertUrl2");
  });

  it("InsertUrlWithChanges", () => {
    const copy = new InsertUrlWithChanges();
    copy.uriStr = `${FIXTURE_URI_1}#link`;
    copy.fragmentId = "The Diagram";
    copy.newId = "six";
    copy.xpathToValue = {
      "*[local-name()='from']/@reference": "one-label",
      "*[local-name()='to']/@reference": "two-label",
    };
    testDoAndUndo(copy, "insertUrlLink");
  });
});

describe("extras", () => {
  it("uniqueId skips existing numeric ids", () => {
    const ctx = loadContext("test_command1.html");
    const root = ctx.getRootElement();
    const g = root.ownerDocument.createElement("glyph");
    g.id = "1";
    root.appendChild(g);
    expect(ctx.uniqueId()).toBe("2");
  });

  it("setStyleValue(null) removes property", () => {
    const ctx = loadContext("test_command1.html");
    const two = ctx.getElementById("two")!;
    ctx.setStyleValue(two, "stroke", "red");
    expect(ctx.getStyleValue(two, "stroke")).toBe("red");
    ctx.setStyleValue(two, "stroke", null);
    expect(ctx.getStyleValue(two, "stroke")).toBeNull();
    expect(two.hasAttribute("style")).toBe(false);
  });

  it("ReplaceAttr mismatches when from differs", () => {
    const ctx = loadContext("test_command1.html");
    const cmd = new ReplaceAttr();
    cmd.fragmentId = "two";
    cmd.name = "name";
    cmd.from = "wrong";
    cmd.to = "value";
    const m = cmd.apply(ctx);
    expect(m).not.toBeNull();
    expect(m!.explain()).toMatch(/changed|Expected/);
  });

  it("Delete content mismatch", () => {
    const ctx = loadContext("test_command1.html");
    const del = new Delete();
    del.fragmentId = "The Diagram";
    del.beforeId = "two";
    del.base64Element = b64(
      `<glyph id="one"><label id="one-label">WRONG</label></glyph>`,
    );
    const m = del.apply(ctx);
    expect(m).not.toBeNull();
  });

  it("Move fromBefore undo restores sibling order", () => {
    const ctx = loadContext("test_command1.html");
    const move = new Move();
    move.moveId = "one-label";
    move.from = "one";
    move.fromBefore = null;
    move.to = "two";
    move.toBefore = "two-label";

    expectNoMismatch(move.apply(ctx), "move apply");
    expect(ctx.getElementById("one-label")!.parentElement!.id).toBe("two");

    expectNoMismatch(move.undo(ctx), "move undo");
    expect(ctx.getElementById("one-label")!.parentElement!.id).toBe("one");

    const ctx2 = loadContext("test_command1.html");
    const move2 = new Move();
    move2.moveId = "two-label";
    move2.from = "two";
    move2.fromBefore = null;
    move2.to = "one";
    move2.toBefore = null;
    expectNoMismatch(move2.apply(ctx2), "move2 apply");

    const ctx3 = loadContext("test_command1.html");
    const m3 = new Move();
    m3.moveId = "one-label";
    m3.from = "one";
    m3.fromBefore = null;
    m3.to = "two";
    m3.toBefore = null;
    expectNoMismatch(m3.apply(ctx3), "m3");
    m3.fromBefore = null;
    expectNoMismatch(m3.undo(ctx3), "m3 undo");
    const one = ctx3.getElementById("one")!;
    expect(one.lastElementChild?.id).toBe("one-label");
  });

  it("structural equality ignores whitespace and style spacing", () => {
    const a = diagramRootFromHtml(
      `<!DOCTYPE html><html><body><g style="color: red;"></g></body></html>`,
    );
    const b = diagramRootFromHtml(
      `<!DOCTYPE html><html><body><g style="color:red"></g></body></html>`,
    );
    expect(rootsStructurallyEqual(a, b)).toBeNull();
  });

  it("ReplaceHtml updates getRootElement when replacing the diagram", () => {
    const ctx = loadContext("test_command1.html");
    const replace = new ReplaceHtml();
    replace.fragmentId = "The Diagram";
    replace.from = b64(ctx.getRootElement().outerHTML);
    replace.to = b64(`<lets id="The Diagram"><do>some</do>replacing</lets>`);
    expectNoMismatch(replace.apply(ctx), "replace root");
    expect(ctx.getRootElement().localName.toLowerCase()).toBe("lets");
    expect(ctx.getRootElement().id).toBe("The Diagram");
  });
});
