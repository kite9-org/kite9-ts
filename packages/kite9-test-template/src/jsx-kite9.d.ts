import type { JSX as PreactJSX } from "preact";

type Kite9Attrs = PreactJSX.HTMLAttributes<HTMLElement> & {
  label?: string;
  shape?: string;
  mode?: string;
  direction?: string;
  drawDirection?: string;
  layout?: string;
  contradicting?: string | boolean;
};

type RefAttrs = { reference?: string };

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "kite9-diagram": Kite9Attrs;
      "kite9-glyph": Kite9Attrs;
      "kite9-container": Kite9Attrs;
      "kite9-arrow": Kite9Attrs;
      "kite9-key": Kite9Attrs;
      "kite9-link": Kite9Attrs;
      "kite9-socket": Kite9Attrs & { along?: string };
      "kite9-from-label": Kite9Attrs;
      "kite9-to-label": Kite9Attrs;
      "kite9-text-line": Kite9Attrs;
      from: RefAttrs;
      to: RefAttrs;
      text: PreactJSX.HTMLAttributes<HTMLElement>;
      fromDecoration: PreactJSX.HTMLAttributes<HTMLElement>;
      toDecoration: PreactJSX.HTMLAttributes<HTMLElement>;
    }
  }
}

export {};
