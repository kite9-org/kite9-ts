import { getDiagramCoords } from "../screen.js";

export type DropLocation = Element;

export type DropLocatorCallback = (
  dragTargets: Element[],
  e: Event,
) => DropLocation | null;
export type DragLocatorCallback = (e: Event) => Element[];
export type MoveCallback = (
  dragTargets: Element[],
  e?: Event,
  dropTargets?: Element[],
) => void;
export type DropCallback = (
  state: StateItem[],
  e: Event,
  dropTargets: Element[],
) => void;

export type StateItem = {
  dragTarget: Element;
  dragParent: Element | null;
  dragParentId: string | null;
  dragBefore?: Element | null;
  dragBeforeId?: string | null;
};

/**
 * Manages pointer-drag state for diagram editing (resize / move).
 * Scoped to a light-DOM diagram root — not a global SVG.
 */
export class Dragger {
  readonly root: Element;

  dragOrigin: { x: number; y: number } | null = null;
  state: StateItem[] | null = null;
  mouseDown = false;
  dropTargets: Element[] = [];

  moveCallbacks: MoveCallback[] = [];
  dropCallbacks: DropCallback[] = [];
  dropLocators: DropLocatorCallback[] = [];
  dragLocators: DragLocatorCallback[] = [];

  private attached = false;
  private readonly onDown: (e: Event) => void;
  private readonly onMove: (e: Event) => void;
  private readonly onUp: (e: Event) => void;

  constructor(root: Element) {
    this.root = root;
    this.onDown = (e) => this.begin(e);
    this.onMove = (e) => this.drag(e);
    this.onUp = (e) => this.end(e);
  }

  moveWith(cb: MoveCallback): void {
    this.moveCallbacks.push(cb);
  }

  dropWith(cb: DropCallback): void {
    this.dropCallbacks.unshift(cb);
  }

  dragLocator(cb: DragLocatorCallback): void {
    this.dragLocators.push(cb);
  }

  dropLocator(cb: DropLocatorCallback): void {
    this.dropLocators.push(cb);
  }

  /** Attach document-level pointer listeners. */
  activate(): () => void {
    if (this.attached) return () => undefined;
    this.attached = true;
    const el = this.root;
    el.addEventListener("mousedown", this.onDown);
    el.addEventListener("touchstart", this.onDown, { passive: false });
    window.addEventListener("mousemove", this.onMove);
    window.addEventListener("touchmove", this.onMove, { passive: false });
    window.addEventListener("mouseup", this.onUp);
    window.addEventListener("touchend", this.onUp);
    return () => this.deactivate();
  }

  deactivate(): void {
    if (!this.attached) return;
    this.attached = false;
    const el = this.root;
    el.removeEventListener("mousedown", this.onDown);
    el.removeEventListener("touchstart", this.onDown);
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("touchmove", this.onMove);
    window.removeEventListener("mouseup", this.onUp);
    window.removeEventListener("touchend", this.onUp);
    this.state = null;
    this.mouseDown = false;
  }

  private begin(evt: Event): void {
    const targets = this.dragLocators.flatMap((l) => l(evt));
    if (targets.length === 0) return;

    this.mouseDown = true;
    this.dragOrigin = getDiagramCoords(evt, this.root);
    this.state = targets.map((dragTarget) => ({
      dragTarget,
      dragParent: dragTarget.parentElement,
      dragParentId: dragTarget.parentElement?.getAttribute("id") ?? null,
      dragBefore: dragTarget.nextElementSibling,
      dragBeforeId: dragTarget.nextElementSibling?.getAttribute("id") ?? null,
    }));
    evt.stopPropagation();
  }

  private drag(evt: Event): void {
    if (!this.mouseDown || !this.state) return;
    this.dropTargets = [];
    for (const locator of this.dropLocators) {
      const drop = locator(
        this.state.map((s) => s.dragTarget),
        evt,
      );
      if (drop) this.dropTargets.push(drop);
    }
    for (const cb of this.moveCallbacks) {
      cb(
        this.state.map((s) => s.dragTarget),
        evt,
        this.dropTargets,
      );
    }
  }

  private end(evt: Event): void {
    if (!this.mouseDown || !this.state) {
      this.mouseDown = false;
      return;
    }
    for (const cb of this.dropCallbacks) {
      cb(this.state, evt, this.dropTargets);
    }
    this.state = null;
    this.mouseDown = false;
    this.dragOrigin = null;
  }
}
