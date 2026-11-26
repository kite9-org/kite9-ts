import type { AdjustableLayout } from "./adjustable-layout/index.js";

/**
 * Mutable layout held during an edit session.
 * Behaviours update `layout` then call `apply()` to paint DOM from the model.
 */
export type LayoutSession = {
  layout: AdjustableLayout;
  apply: () => void;
};
