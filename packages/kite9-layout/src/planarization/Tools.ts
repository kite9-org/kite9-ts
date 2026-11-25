import type { Connection } from "@kite9/model";
import { kite9Log, type Kite9Log } from "../logging/Kite9Log.js";
import type { Logable } from "../logging/Logable.js";

/**
 * Utility functions for manipulating the Planarization
 *
 * @author robmoffat
 */
export class Tools implements Logable {
  log: Kite9Log = kite9Log(this);
  elementNo = 0;

  get prefix(): string {
    return "PLNT";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  static isConnectionContradicting(c: Connection): boolean {
    const rri = c.getRenderingInformation();
    return rri.isContradicting;
  }

  static isConnectionRendered(c: Connection): boolean {
    const rri = c.getRenderingInformation();
    return rri.rendered;
  }

  static setConnectionContradiction(
    c: Connection,
    contradicting: boolean,
    rendering: boolean,
  ): void {
    const rri = c.getRenderingInformation();
    if (c.getDrawDirection() != null) {
      rri.isContradicting = contradicting;
    }
    rri.rendered = rendering;
  }
}
