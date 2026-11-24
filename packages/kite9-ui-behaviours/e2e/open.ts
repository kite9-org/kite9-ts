import { openCardEdit } from "@kite9/test-template/e2e";
import type { Page } from "@playwright/test";
import type { E2eBehaviourId } from "./behaviour-ids.js";

/** Open the e2e harness with only the given behaviours activated. */
export async function openWithBehaviours(
  page: Page,
  ...behaviours: E2eBehaviourId[]
): Promise<void> {
  if (behaviours.length === 0) {
    throw new Error("openWithBehaviours requires at least one behaviour id");
  }
  await openCardEdit(page, {
    query: { behaviours: behaviours.join(",") },
  });
}
