export enum BorderTraversal {
  ALWAYS = "always",
  LEAVING = "leaving",
  PREVENT = "prevent",
}

export function reduceBorderTraversal(
  a: BorderTraversal | null,
  b: BorderTraversal | null,
): BorderTraversal | null {
  if (a == null) return b;
  if (b == null) return a;
  if (a === BorderTraversal.PREVENT || b === BorderTraversal.PREVENT) {
    return BorderTraversal.PREVENT;
  }
  if (a === BorderTraversal.LEAVING || b === BorderTraversal.LEAVING) {
    return BorderTraversal.LEAVING;
  }
  return BorderTraversal.ALWAYS;
}

export enum ConnectionsSeparation {
  SEPARATE = "separate",
  SAME_SIDE = "same-side",
}

export enum ContentTransform {
  NONE = "none",
  RESCALE = "rescale",
  NORMAL = "normal",
  POSITION = "position",
  CROP = "crop",
}

export enum DiagramElementSizing {
  MINIMIZE = "minimize",
  MAXIMIZE = "maximize",
}

/** Cardinal directions — lowercase CSS wire format (`--kite9-direction`, etc.). */
export enum Direction {
  UP = "up",
  LEFT = "left",
  DOWN = "down",
  RIGHT = "right",
}

/** Link end attachment (`from` / `to`). */
export enum End {
  FROM = "from",
  TO = "to",
}

/** Container layout modes — lowercase CSS wire format (`--kite9-layout`). */
export enum Layout {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
  GRID = "grid",
}

/**
 * The six distinct diagram element kinds (see @kite9/model README render layers).
 * Values are lowercase kebab-case (CSS wire format).
 */
export enum DiagramElementType {
  DIAGRAM = "diagram",
  CONNECTED_RECTANGULAR = "connected-rectangular",
  PORT = "port",
  CONNECTION = "connection",
  TERMINATOR = "terminator",
  LABEL = "label",
}

export enum HorizontalAlignment {
  LEFT = "left",
  CENTER = "center",
  RIGHT = "right",
}

export enum VerticalAlignment {
  TOP = "top",
  CENTER = "center",
  BOTTOM = "bottom",
}

export enum Measurement {
  NONE = "none",
  PERCENTAGE = "percentage",
  PIXELS = "pixels",
}

export enum RectangularElementUsage {
  REGULAR = "regular",
  LABEL = "label",
  DECAL = "decal",
}

export enum TextAlign {
  START = "start",
  MIDDLE = "middle",
  END = "end",
  FULL = "full",
}
