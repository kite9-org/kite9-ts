import type { LayoutData } from "@kite9/model";

/** Result of a Chromium functional layout run (`__runFunctionalLayout`). */
export type FunctionalLayoutRun = {
  layout: LayoutData;
  /** PNG base64 (no data: prefix) — Java TestingEngine positions debug. */
  positionsPngBase64: string;
  /** PNG base64 (no data: prefix) — Java TestingEngine compaction debug. */
  compactionPngBase64: string;
  /**
   * Layout completed but a {@link LayoutCheckError} (or similar) failed.
   * Artifacts should still be written; the Playwright test then fails with this message.
   */
  checkError?: string;
};
