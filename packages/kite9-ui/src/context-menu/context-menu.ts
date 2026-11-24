import { getHtmlCoords } from "../screen.js";

export const CONTEXT_MENU_ID = "kite9-contextMenu";
export const CONTEXT_MENU_FORM_ID = "kite9-contextMenu-form";

export type ContextMenuCallback = (event: Event, cm: ContextMenu) => void;

const CONTEXT_MENU_CSS = `
#${CONTEXT_MENU_ID} {
  position: absolute;
  z-index: 200;
  color: #333;
  background: #fff;
  padding: 10px;
  border: 1px solid #5a5a5a;
  border-radius: 10px;
  opacity: 0.95;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  user-select: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
#${CONTEXT_MENU_ID} form {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
#${CONTEXT_MENU_ID} fieldset {
  border: none;
  margin: 0;
  padding: 0;
}
#${CONTEXT_MENU_ID} fieldset.icons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
#${CONTEXT_MENU_ID} legend {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  padding: 0;
  margin-bottom: 4px;
}
#${CONTEXT_MENU_ID} button.kite9-cm-control {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  font: inherit;
  color: inherit;
  min-width: 4.5rem;
}
#${CONTEXT_MENU_ID} button.kite9-cm-control:hover {
  background: #e2e8f0;
}
#${CONTEXT_MENU_ID} button.kite9-cm-control img {
  width: 1.75rem;
  height: 1.75rem;
}
#${CONTEXT_MENU_ID} .kite9-cm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
#${CONTEXT_MENU_ID} .kite9-cm-actions button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  font: inherit;
}
#${CONTEXT_MENU_ID} .kite9-cm-actions button[data-kite9-ok] {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
`;

/**
 * Floating context menu for diagram edit actions (legacy ContextMenu port).
 */
export class ContextMenu {
  private menu: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private readonly callbacks: ContextMenuCallback[] = [];

  add(cb: ContextMenuCallback): void {
    this.callbacks.push(cb);
  }

  /** Run registered callbacks to populate the menu for this event. */
  handle(event: Event): void {
    for (const cb of this.callbacks) {
      cb(event, this);
    }
  }

  destroy(): void {
    this.menu?.remove();
    this.menu = null;
  }

  clear(): void {
    const form = this.getForm();
    if (!form) return;
    while (form.firstChild) form.removeChild(form.firstChild);
  }

  /** Ensure menu DOM exists, positioned near the event. */
  get(event: Event): HTMLFormElement {
    this.ensureStyles();
    let form = document.getElementById(
      CONTEXT_MENU_FORM_ID,
    ) as HTMLFormElement | null;
    if (form && this.menu) return form;

    this.destroy();

    const ctxMenu = document.createElement("div");
    ctxMenu.id = CONTEXT_MENU_ID;
    ctxMenu.className = "kite9-contextMenu";
    ctxMenu.draggable = false;

    form = document.createElement("form");
    form.id = CONTEXT_MENU_FORM_ID;
    form.addEventListener("submit", (e) => e.preventDefault());
    ctxMenu.appendChild(form);

    const coords = getHtmlCoords(event);
    ctxMenu.style.left = `${coords.x + 15}px`;
    ctxMenu.style.top = `${coords.y - 20}px`;

    document.body.appendChild(ctxMenu);
    this.menu = ctxMenu;
    return form;
  }

  fieldset(event: Event, set: string): HTMLElement {
    const form = this.get(event);
    const id = `kite9-contextMenu-${set}`;
    let fs = document.getElementById(id) as HTMLFieldSetElement | null;
    if (!fs) {
      fs = document.createElement("fieldset");
      fs.id = id;
      const legend = document.createElement("legend");
      legend.textContent = set;
      fs.appendChild(legend);
      form.appendChild(fs);
    }
    return fs;
  }

  addControl(
    event: Event,
    imageUrl: string,
    title: string,
    clickListener: (e: Event) => void = () => {},
    set = "Actions",
  ): HTMLButtonElement {
    const fs = this.fieldset(event, set);
    fs.classList.add("icons");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kite9-cm-control";
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.setAttribute("data-kite9-cm", title);

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "";
      btn.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = title;
    btn.appendChild(label);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clickListener(e);
    });

    fs.appendChild(btn);
    return btn;
  }

  addOkCancel(
    event: Event,
    onOk: () => void,
    onCancel: () => void,
  ): void {
    const form = this.get(event);
    const row = document.createElement("div");
    row.className = "kite9-cm-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.setAttribute("data-kite9-cancel", "");
    cancel.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    });

    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";
    ok.setAttribute("data-kite9-ok", "");
    ok.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onOk();
    });

    row.append(cancel, ok);
    form.appendChild(row);
  }

  private getForm(): HTMLFormElement | null {
    return document.getElementById(
      CONTEXT_MENU_FORM_ID,
    ) as HTMLFormElement | null;
  }

  private ensureStyles(): void {
    if (this.styleEl && document.head.contains(this.styleEl)) return;
    this.styleEl = document.createElement("style");
    this.styleEl.setAttribute("data-kite9-context-menu", "");
    this.styleEl.textContent = CONTEXT_MENU_CSS;
    document.head.appendChild(this.styleEl);
  }
}
