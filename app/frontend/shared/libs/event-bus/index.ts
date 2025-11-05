export {
  createEventBus,
  type EventMap,
  type TypedEventBus,
} from "./typedEventBus";

/**
 * Global event listener for window CustomEvents
 * Used for loosely-coupled communication between components
 */
export function on<T = unknown>(
  eventName: string,
  handler: (detail: T) => void
): () => void {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<T>;
    handler(customEvent.detail);
  };

  window.addEventListener(eventName, listener);

  return () => {
    window.removeEventListener(eventName, listener);
  };
}

/**
 * Emit a window CustomEvent
 */
export function emit<T = unknown>(eventName: string, detail: T): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
