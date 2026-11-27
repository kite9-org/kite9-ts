import type { LayoutData } from "@kite9/model";

/** Result of a Chromium functional layout run (`__runFunctionalLayout`). */
export type FunctionalLayoutRun = {
  layout: LayoutData;
  /** PNG base64 (no data: prefix) — optional debug (layout engine). */
  positionsPngBase64?: string;
  /** PNG base64 (no data: prefix) — optional debug (layout engine). */
  compactionPngBase64?: string;
  /**
   * Layout completed but a constraint check failed.
   * Artifacts should still be written; the Playwright test then fails with this message.
   */
  checkError?: string;
};
