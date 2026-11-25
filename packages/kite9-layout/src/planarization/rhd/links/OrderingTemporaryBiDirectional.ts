import { DiagramElementType } from "@kite9/model";
import type {
  Connected,
  DiagramElement,
  Direction,
  Rectangular,
  RenderingInformation,
  Temporary,
} from "@kite9/model";
import { AbstractBiDirectional } from "../../../common/elements/AbstractBiDirectional.js";
import { LogicException } from "../../../logging/LogicException.js";

/**
 * Used for enforcing container ordering.
 *
 * `getType()` reports CONNECTION as the nearest model type, but this is not a `Connection`
 * (it has no rank or decorations), so `isConnection()` is false for it.
 *
 * @author robmoffat
 */
export class OrderingTemporaryBiDirectional
  extends AbstractBiDirectional<Connected>
  implements Temporary
{
  private readonly id: string;

  constructor(
    private readonly f: Connected,
    private readonly t: Connected,
    private readonly dd: Direction,
  ) {
    super();
    this.id = f.getID() + ":" + t.getID();
  }

  getType(): DiagramElementType {
    return DiagramElementType.CONNECTION;
  }

  getFrom(): Connected {
    return this.f;
  }

  getTo(): Connected {
    return this.t;
  }

  getDrawDirection(): Direction {
    return this.dd;
  }

  getID(): string {
    return this.id;
  }

  getParent(): DiagramElement | null {
    return null;
  }

  getRenderingInformation(): RenderingInformation {
    throw new LogicException("Temporary elements shouldn't be rendered");
  }

  getDepth(): number {
    return 0;
  }

  getContainer(): Rectangular | null {
    return null;
  }

  compareTo(_other: DiagramElement): number {
    throw new LogicException("Not used");
  }
}
