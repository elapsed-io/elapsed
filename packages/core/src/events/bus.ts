/**
 * A typed, synchronous event bus (plan, Architecture invariant 3). The engine
 * emits; the UI, display modes, widgets and later the statistics module
 * subscribe. Nothing calls across those layers directly.
 *
 * - Events are delivered in the order they are emitted. An event emitted by a
 *   handler is queued and delivered after the current one finishes, so every
 *   subscriber sees the same order.
 * - A handler that throws does not stop the others; the error goes to
 *   `onError`.
 * - A handler added during delivery starts with the next event; a handler
 *   removed during delivery receives nothing more.
 */

export type Handler<T> = (payload: T) => void;

/** What a producer needs: the ability to emit events of a known map. */
export interface Emitter<M extends object> {
  emit<K extends keyof M & string>(type: K, payload: M[K]): void;
}

export interface EventBusOptions {
  readonly onError: (error: unknown) => void;
}

export class EventBus<M extends object> implements Emitter<M> {
  readonly #onError: (error: unknown) => void;
  readonly #handlers = new Map<string, Set<Handler<never>>>();
  readonly #queue: [string, unknown][] = [];
  #delivering = false;

  constructor(options: EventBusOptions) {
    this.#onError = options.onError;
  }

  /** Subscribes to one event type. Returns a function that unsubscribes. */
  on<K extends keyof M & string>(type: K, handler: Handler<M[K]>): () => void {
    let set = this.#handlers.get(type);
    if (set === undefined) {
      set = new Set();
      this.#handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof M & string>(type: K, payload: M[K]): void {
    this.#queue.push([type, payload]);
    if (this.#delivering) return;
    this.#delivering = true;
    try {
      for (let next = this.#queue.shift(); next !== undefined; next = this.#queue.shift()) {
        const [queuedType, queuedPayload] = next;
        const set = this.#handlers.get(queuedType);
        if (set === undefined) continue;
        for (const handler of [...set]) {
          if (!set.has(handler)) continue;
          try {
            (handler as Handler<unknown>)(queuedPayload);
          } catch (error) {
            this.#onError(error);
          }
        }
      }
    } finally {
      this.#delivering = false;
    }
  }

  /** Removes every handler. */
  clear(): void {
    this.#handlers.clear();
  }
}
