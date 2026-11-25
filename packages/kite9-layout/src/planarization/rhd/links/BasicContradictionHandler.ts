import { Direction, Layout } from "@kite9/model";
import type {
  BiDirectional,
  Connected,
  ConnectedRectangular,
  Connection,
  DiagramElement,
  IntegerRange,
  Port,
  Rectangular,
} from "@kite9/model";
import { GridPositionerImpl } from "../../../common/elements/grid/GridPositionerImpl.js";
import {
  isConnected,
  isConnection,
  isDiagram,
  isRectangular,
} from "../../../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import { LogicException } from "../../../logging/LogicException.js";
import { Tools } from "../../Tools.js";
import { GroupPhase } from "../GroupPhase.js";
import type { ContradictionHandler } from "./ContradictionHandler.js";
import type { LinkDetail } from "./LinkManager.js";

export class BasicContradictionHandler implements Logable, ContradictionHandler {
  private readonly log: Kite9Log = kite9Log(this);

  get prefix(): string {
    return "CH  ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  setContradicting(connections: Iterable<BiDirectional<Connected>>, dontRender: boolean): void {
    for (const bic of connections) {
      this.setContradiction(bic, dontRender);
    }
  }

  setContradiction(bic: BiDirectional<Connected>, dontRender: boolean): void {
    this.log.error(`Contradiction: ${bic}`);
    if (isConnection(bic)) {
      Tools.setConnectionContradiction(bic, true, !dontRender);
    } else {
      // this will only get called when we are adding an illegal.
      // however, this would be setting a contradiction on a layout, so
      // we should do nothing here.
    }
  }

  checkContradiction(
    ld1: LinkDetail | null,
    ld2: LinkDetail | null,
    containerLayout: Layout | null,
  ): Direction | null;
  checkContradiction(
    ad: Direction | null,
    aOrdering: boolean,
    aRank: number,
    ac: Iterable<BiDirectional<Connected>>,
    bd: Direction | null,
    bOrdering: boolean,
    bRank: number,
    bc: Iterable<BiDirectional<Connected>>,
    containerLayout: Layout | null,
  ): Direction | null;
  checkContradiction(...args: unknown[]): Direction | null {
    if (args.length === 3) {
      const ld1 = args[0] as LinkDetail | null;
      const ld2 = args[1] as LinkDetail | null;
      const containerLayout = args[2] as Layout | null;
      if (ld1 == null) {
        return ld2!.direction;
      } else if (ld2 == null) {
        return ld1.direction;
      } else {
        return this.checkDirectionContradiction(
          ld1.direction,
          ld1.isOrderingLink,
          ld1.linkRank,
          ld1.connections,
          ld2.direction,
          ld2.isOrderingLink,
          ld2.linkRank,
          ld2.connections,
          containerLayout,
        );
      }
    }
    return this.checkDirectionContradiction(
      args[0] as Direction | null,
      args[1] as boolean,
      args[2] as number,
      args[3] as Iterable<BiDirectional<Connected>>,
      args[4] as Direction | null,
      args[5] as boolean,
      args[6] as number,
      args[7] as Iterable<BiDirectional<Connected>>,
      args[8] as Layout | null,
    );
  }

  private checkDirectionContradiction(
    ad: Direction | null,
    aOrdering: boolean,
    aRank: number,
    ac: Iterable<BiDirectional<Connected>>,
    bd: Direction | null,
    bOrdering: boolean,
    bRank: number,
    bc: Iterable<BiDirectional<Connected>>,
    containerLayout: Layout | null,
  ): Direction | null {
    if (containerLayout != null) {
      switch (containerLayout) {
        case Layout.HORIZONTAL:
          if (GroupPhase.isVerticalDirection(ad)) {
            this.setContradicting(ac, false);
          }
          if (GroupPhase.isVerticalDirection(bd)) {
            this.setContradicting(bc, false);
          }
          break;
        case Layout.VERTICAL:
          if (GroupPhase.isHorizontalDirection(ad)) {
            this.setContradicting(ac, false);
          }
          if (GroupPhase.isHorizontalDirection(bd)) {
            this.setContradicting(bc, false);
          }
          break;
        default:
          break;
      }
    }
    if (ad === bd) {
      return ad;
    } else if (ad == null) {
      return bd;
    } else if (bd == null) {
      return ad;
    } else if (aOrdering && !bOrdering) {
      this.setContradicting(bc, false);
      return ad;
    } else if (bOrdering && !aOrdering) {
      this.setContradicting(ac, false);
      return bd;
    } else if (!bOrdering && !aOrdering) {
      if (aRank >= bRank) {
        this.setContradicting(bc, false);
        return ad;
      } else {
        this.setContradicting(ac, false);
        return bd;
      }
    } else {
      throw new LogicException(`Contradicting, ordering direction: ${ad} ${bd}`);
    }
  }

  /**
   * Makes sure straight edges leaving port are in the right direction
   */
  checkForPortContradiction(p: Port): void {
    const expectedDirection = p.getPortDirection();

    const allDirecteds = p.getLinks().filter((it) => it.getDrawDirection() != null);

    const badDirecteds = allDirecteds.filter(
      (it) => it.getDrawDirectionFrom(p) !== expectedDirection,
    );

    if (badDirecteds.length > 0) {
      for (const it of badDirecteds) {
        Tools.setConnectionContradiction(it, true, Tools.isConnectionRendered(it));
        this.log.send(`Direction of ${it} not same as port side`);
      }
    }

    // check for multiple edges in the same direction
    const remaining = allDirecteds.filter((it) => !badDirecteds.includes(it));

    if (remaining.length > 1) {
      remaining
        .filter((_v, i) => i < remaining.length - 1)
        .forEach((it) => {
          Tools.setConnectionContradiction(it, true, Tools.isConnectionRendered(it));
          this.log.send(`Port Leaver ${it} goes in fixed direction, but we already have one`);
        });
    }
  }

  /**
   * Simple test to make sure that c doesn't contradict the direction of the
   * top-level container it passes through. Or, that something is connecting
   * to an element inside itself.
   */
  checkForContainerContradiction(c: Connection): void {
    const drawDirection = c.getDrawDirection();
    let from: DiagramElement = c.getFrom();
    let to: DiagramElement = c.getTo();
    if (from === to) {
      this.setContradiction(c, true);
    }
    if (isDiagram(from) || isDiagram(to)) {
      this.setContradiction(c, true);
      return;
    }
    if ((from as Connected).getContainer()?.getLayout() === Layout.GRID) {
      this.setContradiction(c, true);
      return;
    }
    if ((to as Connected).getContainer()?.getLayout() === Layout.GRID) {
      this.setContradiction(c, true);
      return;
    }
    while (true) {
      const fromC = isConnected(from) ? from.getContainer() : null;
      const toC = isConnected(to) ? to.getContainer() : null;
      if (drawDirection != null) {
        // directed connections breaking normal layouts
        if (fromC === toC) {
          const l = fromC!.getLayout();
          if (l == null) {
            return;
          } else {
            switch (l) {
              case Layout.HORIZONTAL:
                this.verticalContradiction(c, drawDirection);
                break;
              case Layout.VERTICAL:
                this.horizontalContradiction(c, drawDirection);
                break;
              case Layout.UP:
              case Layout.DOWN:
              case Layout.LEFT:
              case Layout.RIGHT:
                this.checkOrdinalContradiction(
                  l,
                  drawDirection,
                  from as Connected,
                  to as Connected,
                  fromC,
                  c,
                );
                break;
              case Layout.GRID:
                this.gridContradiction(
                  c,
                  drawDirection,
                  from as ConnectedRectangular,
                  to as ConnectedRectangular,
                );
                break;
            }
          }
        }
      }

      // check for illegal containment
      if (isRectangular(to)) {
        if (to.getContents().includes(from)) {
          this.setContradiction(c, true);
        }
      }
      if (isRectangular(from)) {
        if (from.getContents().includes(to)) {
          this.setContradiction(c, true);
        }
      }
      if (fromC === toC) {
        return;
      }
      const depthFrom = fromC!.getDepth();
      const depthTo = toC!.getDepth();
      if (depthFrom < depthTo) {
        to = toC!;
      } else if (depthFrom > depthTo) {
        from = fromC!;
      } else {
        to = toC!;
        from = fromC!;
      }
    }
  }

  private gridContradiction(
    c: Connection,
    drawDirection: Direction,
    fromC: ConnectedRectangular | null,
    toC: ConnectedRectangular | null,
  ): void {
    const x = GridPositionerImpl.getXOccupies;
    const y = GridPositionerImpl.getYOccupies;
    // do special grid checking
    switch (drawDirection) {
      case Direction.LEFT:
        this.gridPositionAfterOrContradiction(x(fromC!), x(toC!), c);
        this.gridPositionOverlapOrContradiction(y(fromC!), y(toC!), c);
        break;
      case Direction.RIGHT:
        this.gridPositionAfterOrContradiction(x(toC!), x(fromC!), c);
        this.gridPositionOverlapOrContradiction(y(fromC!), y(toC!), c);
        break;
      case Direction.UP:
        this.gridPositionAfterOrContradiction(y(fromC!), y(toC!), c);
        this.gridPositionOverlapOrContradiction(x(fromC!), x(toC!), c);
        break;
      case Direction.DOWN:
        this.gridPositionAfterOrContradiction(y(toC!), y(fromC!), c);
        this.gridPositionOverlapOrContradiction(x(fromC!), x(toC!), c);
        break;
    }
  }

  private gridPositionOverlapOrContradiction(
    a: IntegerRange,
    b: IntegerRange,
    c: Connection,
  ): void {
    const fromInside = a.from <= b.from && a.from >= b.to;
    const toInside = a.to <= b.from && a.to >= b.to;
    if (!(fromInside || toInside)) {
      this.setContradiction(c, false);
    }
  }

  private gridPositionAfterOrContradiction(
    a: IntegerRange,
    b: IntegerRange,
    c: Connection,
  ): void {
    if (a.to < b.from) {
      this.setContradiction(c, false);
    }
  }

  protected checkOrdinalContradiction(
    l: Layout | null,
    d: Direction,
    from: Connected | null,
    to: Connected | null,
    fromC: Rectangular | null,
    c: Connection | null,
  ): void {
    const ld = GroupPhase.getDirectionForLayout(l);
    if (GroupPhase.isHorizontalDirection(ld) !== GroupPhase.isHorizontalDirection(d)) {
      this.setContradiction(c!, false);
      return;
    }

    // ld and d in the same axis
    const reversed = ld !== d;
    const fromI = fromC!.getContents().indexOf(from as Connected);
    const toI = fromC!.getContents().indexOf(to as Connected);
    const contradiction = fromI < toI ? reversed : !reversed;
    if (contradiction) this.setContradiction(c!, false);
  }

  private horizontalContradiction(c: Connection, drawDirection: Direction): void {
    if (GroupPhase.isHorizontalDirection(drawDirection)) {
      this.setContradiction(c, false);
    }
  }

  private verticalContradiction(c: Connection, drawDirection: Direction): void {
    if (GroupPhase.isVerticalDirection(drawDirection)) {
      this.setContradiction(c, false);
    }
  }
}
