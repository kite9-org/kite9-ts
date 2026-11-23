import { DiagramElementType } from "@kite9/model";
import { createTemplatePack, type TemplatePack } from "@kite9/templating";
import { renderContainerChrome } from "./templates/container/index.js";
import { renderDiagramChrome } from "./templates/diagram/index.js";
import { renderGlyphChrome } from "./templates/glyph/index.js";
import { renderLabelChrome } from "./templates/label/index.js";
import { renderLinkChrome } from "./templates/link/index.js";

/**
 * Light-DOM pack using `kite9-*` custom elements (same idea as
 * shadow-dom-cursor/layers.html — avoids HTML void tags like `<link>`).
 */
export const testTemplatePack: TemplatePack = createTemplatePack("test", {
  "kite9-diagram": {
    elementType: DiagramElementType.DIAGRAM,
    render: renderDiagramChrome,
  },
  "kite9-glyph": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    render: renderGlyphChrome,
  },
  "kite9-container": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    render: renderContainerChrome,
  },
  "kite9-arrow": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    render: renderGlyphChrome,
  },
  "kite9-link": {
    elementType: DiagramElementType.CONNECTION,
    render: renderLinkChrome,
  },
  "kite9-from-label": {
    elementType: DiagramElementType.LABEL,
    render: renderLabelChrome,
  },
  "kite9-to-label": {
    elementType: DiagramElementType.LABEL,
    render: renderLabelChrome,
  },
  "kite9-port": {
    elementType: DiagramElementType.PORT,
  },
  "kite9-socket": {
    elementType: DiagramElementType.PORT,
  },
  "kite9-key": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
  },
});
