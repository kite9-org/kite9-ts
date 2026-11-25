import type {
  BiDirectional,
  Connected,
  Connection,
  Direction,
  Layout,
  Port,
} from "@kite9/model";
import type { LinkDetail } from "./LinkManager.js";

/**
 * Contains code for managing/checking for contradictions in links.
 *
 * @author robmoffat
 */
export interface ContradictionHandler {
  checkForContainerContradiction(c: Connection): void;

  checkForPortContradiction(p: Port): void;

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

  checkContradiction(
    ld1: LinkDetail | null,
    ld2: LinkDetail | null,
    containerLayout: Layout | null,
  ): Direction | null;

  setContradiction(bic: BiDirectional<Connected>, dontRender: boolean): void;
  setContradicting(connections: Iterable<BiDirectional<Connected>>, dontRender: boolean): void;
}
