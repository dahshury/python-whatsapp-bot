export type EventMap = Record<string, unknown>

export type TypedEventBus<TEvents extends EventMap> = {
	on<TKey extends keyof TEvents & string>(
		type: TKey,
		handler: (payload: TEvents[TKey]) => void
	): () => void
	emit<TKey extends keyof TEvents & string>(
		type: TKey,
		payload: TEvents[TKey]
	): void
	off<TKey extends keyof TEvents & string>(
		type: TKey,
		handler: (payload: TEvents[TKey]) => void
	): void
}

export function createEventBus<
	TEvents extends EventMap,
>(): TypedEventBus<TEvents> {
	const listeners = new Map<string, Set<(payload: unknown) => void>>()

	const on = <TKey extends keyof TEvents & string>(
		type: TKey,
		handler: (payload: TEvents[TKey]) => void
	) => {
		let set = listeners.get(type)
		if (!set) {
			set = new Set<(payload: unknown) => void>()
			listeners.set(type, set)
		}
		set.add(handler as (payload: unknown) => void)
		return () => off(type, handler)
	}

	const off = <TKey extends keyof TEvents & string>(
		type: TKey,
		handler: (payload: TEvents[TKey]) => void
	) => {
		listeners.get(type)?.delete(handler as (payload: unknown) => void)
	}

	const emit = <TKey extends keyof TEvents & string>(
		type: TKey,
		payload: TEvents[TKey]
	) => {
		const ls = listeners.get(type)
		if (!ls) {
			return
		}
		for (const handler of Array.from(ls)) {
			try {
				handler(payload as unknown)
			} catch {
				/* noop */
			}
		}
	}

	return { on, emit, off }
}
