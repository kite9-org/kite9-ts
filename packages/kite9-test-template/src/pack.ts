import { DiagramElementType } from "@kite9/model";
import { createTemplatePack, type TemplatePack } from "@kite9/templating";
import { renderContainerChrome } from "./templates/container/index.js";
import { renderDiagramChrome } from "./templates/diagram/index.js";
import { renderGlyphChrome } from "./templates/glyph/index.js";
import { renderKeyChrome } from "./templates/key/index.js";
import { renderLabel, renderLabelChrome } from "./templates/label/index.js";
import { renderLinkChrome, renderSvg } from "./templates/link/index.js";
import { renderPortChrome } from "./templates/port/index.js";
import { renderDefs } from "./templates/terminator/index.js";

/**
 * Light-DOM pack using `kite9-*` custom elements (same idea as
 * shadow-dom-cursor/layers.html — avoids HTML void tags like `<link>`).
 * Tag → template: HTML scene / SVG scene / SVG defs painters.
 */
export const testTemplatePack: TemplatePack = createTemplatePack("test", {
  "kite9-diagram": {
    elementType: DiagramElementType.DIAGRAM,
    renderHtml: renderDiagramChrome,
  },
  "kite9-glyph": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    renderHtml: renderGlyphChrome,
  },
  "kite9-container": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    renderHtml: renderContainerChrome,
  },
  "kite9-arrow": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    renderHtml: renderGlyphChrome,
  },
  "kite9-link": {
    elementType: DiagramElementType.CONNECTION,
    renderHtml: renderLinkChrome,
    renderSvg,
    renderDefs,
  },
  "kite9-from-label": {
    elementType: DiagramElementType.LABEL,
    renderHtml: renderLabelChrome,
    renderLabel,
  },
  "kite9-to-label": {
    elementType: DiagramElementType.LABEL,
    renderHtml: renderLabelChrome,
    renderLabel,
  },
  "kite9-socket": {
    elementType: DiagramElementType.PORT,
    renderHtml: renderPortChrome,
  },
  "kite9-key": {
    elementType: DiagramElementType.CONNECTED_RECTANGULAR,
    renderHtml: renderKeyChrome,
  },
});
