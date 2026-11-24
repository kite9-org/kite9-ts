type EventHandler = (event: Event) => void;

type NamedEventHandlers = { [key: string]: EventHandler };

const declaredHandlers = new WeakMap<EventTarget, NamedEventHandlers>();

/**
 * Adds an event handler to the target with a name so it can be replaced later.
 */
export function addNamedEventListener(
  et: EventTarget,
  type: string,
  name: string,
  eh: EventHandler,
  options?: AddEventListenerOptions,
): void {
  const listeners: NamedEventHandlers = declaredHandlers.get(et) ?? {};

  const oldListener = listeners[name];
  if (oldListener) {
    et.removeEventListener(type, oldListener);
  }
  listeners[name] = eh;
  declaredHandlers.set(et, listeners);

  et.addEventListener(type, eh, options);
}

export function getNamedEventListener(
  name: string,
  e: Element | Document,
): EventHandler | undefined {
  const listeners: NamedEventHandlers = declaredHandlers.get(e) ?? {};
  return listeners[name];
}

export function removeNamedEventListener(
  et: EventTarget,
  type: string,
  name: string,
): void {
  const listeners = declaredHandlers.get(et);
  if (!listeners) return;
  const eh = listeners[name];
  if (!eh) return;
  et.removeEventListener(type, eh);
  delete listeners[name];
}
