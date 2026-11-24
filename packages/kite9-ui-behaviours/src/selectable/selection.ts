export function clearLastSelected(within: Element): void {
  within.querySelectorAll(".lastSelected").forEach((c) => {
    c.classList.remove("lastSelected");
  });
}

export function lastSelected(element: Element): void {
  element.classList.add("lastSelected");
}

export function select(element: Element, within: Element): void {
  element.classList.add("selected");

  // unselect nested elements
  element.querySelectorAll(".selected").forEach((c) => {
    c.classList.remove("selected");
  });

  // unselect parent elements
  let v: Element | null = element;
  while (v) {
    v = v.parentElement;
    if (v != null) {
      v.classList.remove("selected");
    }
  }

  clearLastSelected(within);
  lastSelected(element);
}

export function isSelected(element: Element): boolean {
  return element.classList.contains("selected");
}

export function isLastSelected(element: Element): boolean {
  return element.classList.contains("lastSelected");
}

export function singleSelect(elements: Element[], within: Element): void {
  within.querySelectorAll(".selected").forEach((c) => {
    c.classList.remove("selected");
  });

  elements.forEach((e) => e.classList.add("selected"));

  clearLastSelected(within);
  if (elements[0]) lastSelected(elements[0]);
}

export function unselect(element: Element): void {
  element.classList.remove("selected");
}

export function clearSelection(within: Element): void {
  within.querySelectorAll(".selected").forEach((c) => {
    c.classList.remove("selected");
  });
  clearLastSelected(within);
}

export const SELECTION_CHANGE_EVENT = "kite9-selection-change";

export function emitSelectionChange(root: Element): void {
  root.dispatchEvent(
    new CustomEvent(SELECTION_CHANGE_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        selected: Array.from(root.querySelectorAll(".selected")),
        lastSelected: root.querySelector(".lastSelected"),
      },
    }),
  );
}
