import { DiagramElementType } from "@kite9/model";
import type {
  AlignedRectangular,
  Connected,
  ConnectedRectangular,
  Connection,
  Diagram,
  DiagramElement,
  Port,
  Rectangular,
} from "@kite9/model";

/**
 * Runtime equivalents of Kotlin `is X` checks against the `@kite9/model` interfaces.
 * Structural interfaces (Rectangular, Connected, AlignedRectangular) are detected by their
 * distinguishing methods, since temporary elements may not report a matching `getType()`.
 */

function hasMethod(x: unknown, name: string): boolean {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Record<string, unknown>)[name] === "function"
  );
}

function typeOf(x: unknown): DiagramElementType | null {
  return hasMethod(x, "getType") ? (x as DiagramElement).getType() : null;
}

export function isConnection(x: unknown): x is Connection {
  return typeOf(x) === DiagramElementType.CONNECTION && hasMethod(x, "getRank");
}

export function isPort(x: unknown): x is Port {
  return typeOf(x) === DiagramElementType.PORT;
}

export function isDiagram(x: unknown): x is Diagram {
  return typeOf(x) === DiagramElementType.DIAGRAM;
}

export function isRectangular(x: unknown): x is Rectangular {
  const t = typeOf(x);
  // Ports/labels/terminators also expose adapter getContents — they are not layout containers.
  if (
    t === DiagramElementType.PORT ||
    t === DiagramElementType.CONNECTION ||
    t === DiagramElementType.TERMINATOR ||
    t === DiagramElementType.LABEL
  ) {
    return false;
  }
  return hasMethod(x, "getContents");
}

export function isConnected(x: unknown): x is Connected {
  return hasMethod(x, "getLinks");
}

export function isConnectedRectangular(x: unknown): x is ConnectedRectangular {
  // Require the connected-rectangular type so ports (which also expose
  // getContents/getLinks via RectangularAdapter) are not counted as containers.
  return (
    typeOf(x) === DiagramElementType.CONNECTED_RECTANGULAR &&
    hasMethod(x, "getContents") &&
    hasMethod(x, "getLinks")
  );
}

export function isAlignedRectangular(x: unknown): x is AlignedRectangular {
  return isRectangular(x) && hasMethod(x, "getConnectionAlignment");
}
