import type { Logable } from "../../../logging/Logable.js";
import { NoFurtherPathException } from "./NoFurtherPathException.js";
import type { PathLocation } from "./PathLocation.js";
import { State } from "./State.js";

/**
 * Abstract implementation of the Dijkstra Successive Shortest Path algorithm.
 *
 * @author robmoffat
 */
export abstract class AbstractSSP<P extends PathLocation<P>> implements Logable {
  private _lastState: State<P> | null = null;

  get lastState(): State<P> | null {
    return this._lastState;
  }

  getLocation(path: P): unknown {
    return path.getLocation();
  }

  createShortestPath(): P {
    const s = this.createState();
    this._lastState = s;
    try {
      this.createInitialPaths(s);
      while (true) {
        let r: P;
        do {
          r = s.remove();
        } while (!r.isActive());
        if (this.pathComplete(r)) {
          return r;
        }
        this.generateSuccessivePaths(r, s);
      }
    } catch (e) {
      console.error(e);
      throw new NoFurtherPathException(e);
    }
  }

  protected createState(): State<P> {
    return new State(this);
  }

  /**
   * Returns true if the path arrives at its destination
   */
  protected abstract pathComplete(r: P): boolean;

  /**
   * Generates successive valid paths from r, and adds them to the list of
   * paths.
   */
  protected abstract generateSuccessivePaths(r: P, s: State<P>): void;

  protected abstract createInitialPaths(s: State<P>): void;

  get prefix(): string {
    return "SSP ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }
}
