import * as C from "./constants.js";
import {
  BorderTraversal,
  ConnectionsSeparation,
  ContentTransform,
  DiagramElementType,
  Direction,
  Layout,
  RectangularElementUsage,
} from "./enums.js";
import { enumSyntax, toCssValue } from "./values.js";

export type CSSPropertyDef = {
  name: string;
  syntax: string;
  initialValue: string | null;
  inherits: boolean;
};

type RegisterPropertyFn = (def: {
  name: string;
  syntax: string;
  inherits: boolean;
  initialValue?: string;
}) => void;

function lower<E extends string>(e: E): string {
  return toCssValue(e);
}

/** Property definitions mirroring Kotlin jsMain CSSConfig. */
export function kite9PropertyDefs(): CSSPropertyDef[] {
  const typeSyntax = enumSyntax(DiagramElementType, ["none"]);
  const usageSyntax = enumSyntax(RectangularElementUsage);
  const layoutSyntax = enumSyntax(Layout, ["none"]);
  const transformSyntax = enumSyntax(ContentTransform);
  const traversalSyntax = enumSyntax(BorderTraversal);
  const traversalSide = `${enumSyntax(BorderTraversal)} | none`;
  const connectionsSyntax = enumSyntax(ConnectionsSeparation);
  const directionSyntax = enumSyntax(Direction, ["none"]);

  return [
    {
      name: C.ELEMENT_TYPE_PROPERTY,
      syntax: typeSyntax,
      initialValue: "none",
      inherits: false,
    },
    {
      name: C.ELEMENT_USAGE_PROPERTY,
      syntax: usageSyntax,
      initialValue: lower(RectangularElementUsage.REGULAR),
      inherits: false,
    },
    { name: C.LAYOUT_PROPERTY, syntax: layoutSyntax, initialValue: "none", inherits: false },
    {
      name: C.CONTENT_TRANSFORM,
      syntax: transformSyntax,
      initialValue: lower(ContentTransform.NORMAL),
      inherits: false,
    },

    {
      name: C.TRAVERSAL_PROPERTY,
      syntax: traversalSyntax,
      initialValue: lower(BorderTraversal.LEAVING),
      inherits: false,
    },
    { name: C.TRAVERSAL_BOTTOM_PROPERTY, syntax: traversalSide, initialValue: "none", inherits: false },
    { name: C.TRAVERSAL_LEFT_PROPERTY, syntax: traversalSide, initialValue: "none", inherits: false },
    { name: C.TRAVERSAL_TOP_PROPERTY, syntax: traversalSide, initialValue: "none", inherits: false },
    { name: C.TRAVERSAL_RIGHT_PROPERTY, syntax: traversalSide, initialValue: "none", inherits: false },

    {
      name: C.CONNECTIONS_PROPERTY,
      syntax: connectionsSyntax,
      initialValue: lower(ConnectionsSeparation.SAME_SIDE),
      inherits: false,
    },

    { name: C.DIRECTION, syntax: directionSyntax, initialValue: "none", inherits: true },

    { name: C.LINK_INSET, syntax: "<length>", initialValue: "0", inherits: false },
    { name: C.LINK_MINIMUM_LENGTH, syntax: "<length>", initialValue: "0", inherits: false },
    { name: C.LINK_GUTTER, syntax: "<length>", initialValue: "0", inherits: false },
    { name: C.LINK_CORNER_RADIUS, syntax: "<length>", initialValue: "0", inherits: false },

    { name: C.MARKER_RESERVE, syntax: "<length>", initialValue: "0", inherits: false },

    { name: C.PORT_POSITION, syntax: "<length-percentage>", initialValue: "50%", inherits: false },
  ];
}

/**
 * Register Kite9 custom properties with the browser CSS Houdini API when available.
 * Soft-fails in environments without `CSS.registerProperty` (e.g. happy-dom).
 */
export function registerKite9Properties(
  register?: RegisterPropertyFn,
): { registered: number; skipped: number } {
  const fn =
    register ??
    (typeof CSS !== "undefined" &&
    typeof (CSS as unknown as { registerProperty?: RegisterPropertyFn }).registerProperty ===
      "function"
      ? (CSS as unknown as { registerProperty: RegisterPropertyFn }).registerProperty.bind(CSS)
      : null);

  let registered = 0;
  let skipped = 0;

  for (const def of kite9PropertyDefs()) {
    if (!fn) {
      skipped += 1;
      continue;
    }
    try {
      fn({
        name: def.name,
        syntax: def.syntax,
        inherits: def.inherits,
        initialValue: def.initialValue ?? undefined,
      });
      registered += 1;
    } catch {
      skipped += 1;
    }
  }

  return { registered, skipped };
}
