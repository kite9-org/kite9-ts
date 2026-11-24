import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diagramRootFromHtml,
  TestLocalCommandContext,
  type Command,
} from "../src/index.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export const FIXTURE_URI_1 = "http://fixtures/test_command1.html";
export const FIXTURE_URI_2 = "http://fixtures/test_command2.html";

export function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

export function b64(html: string): string {
  return Buffer.from(html, "utf8").toString("base64");
}

export function loadContext(
  fixtureName: string,
  uri: string = FIXTURE_URI_1,
): TestLocalCommandContext {
  const html1 = loadFixture("test_command1.html");
  const html2 = loadFixture("test_command2.html");
  const html = loadFixture(fixtureName);
  const root = diagramRootFromHtml(html);
  return new TestLocalCommandContext(root, uri, {
    [FIXTURE_URI_1]: html1,
    [FIXTURE_URI_2]: html2,
    [uri]: html,
  });
}

export function expectNoMismatch(
  m: { explain(): string } | null,
  label: string,
): void {
  if (m != null) {
    throw new Error(`${label}: ${m.explain()}`);
  }
}

/** Apply command, assert against after_{name}.html, undo, assert original. */
export function testDoAndUndo(
  cmd: Command,
  name: string,
  setupFixture: string = "test_command1.html",
  setupUri: string = FIXTURE_URI_1,
): void {
  const ctx = loadContext(setupFixture, setupUri);
  const originalRoot = diagramRootFromHtml(loadFixture(setupFixture));

  expectNoMismatch(cmd.apply(ctx), `${name} apply`);

  const expectedAfter = diagramRootFromHtml(loadFixture(`after_${name}.html`));
  expectNoMismatch(
    ctx.twoElementsAreIdentical(ctx.getRootElement(), expectedAfter),
    `${name} after compare`,
  );

  expectNoMismatch(cmd.undo(ctx), `${name} undo`);

  expectNoMismatch(
    ctx.twoElementsAreIdentical(ctx.getRootElement(), originalRoot),
    `${name} undo compare`,
  );
}
