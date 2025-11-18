import { unstable_batchedUpdates } from 'react-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used as a generic constraint for any function signature
// biome-ignore lint/suspicious/noExplicitAny: Used as a generic constraint for any function signature
type AnyFunc = (...args: any[]) => void

type Throttled<T extends AnyFunc> = ((...args: Parameters<T>) => void) & {
	cancel: () => void
	flush: () => void
}

export function throttleRAF<T extends AnyFunc>(fn: T): Throttled<T> {
	let frameId: number | null = null
	let lastArgs: Parameters<T> | null = null

	const invoke = () => {
		frameId = null
		if (!lastArgs) {
			return
		}
		const args = lastArgs
		lastArgs = null
		fn(...args)
	}

	const throttled = ((...args: Parameters<T>) => {
		lastArgs = args
		if (frameId != null) {
			return
		}
		frameId = requestAnimationFrame(invoke)
	}) as Throttled<T>

	throttled.cancel = () => {
		if (frameId != null) {
			try {
				cancelAnimationFrame(frameId)
			} catch {
				// Ignore cancellation errors to mirror caller expectations.
			}
			frameId = null
		}
		lastArgs = null
	}

	throttled.flush = () => {
		if (frameId != null) {
			try {
				cancelAnimationFrame(frameId)
			} catch {
				// Ignore cancellation errors and continue with flush.
			}
			frameId = null
		}
		if (!lastArgs) {
			return
		}
		const args = lastArgs
		lastArgs = null
		fn(...args)
	}

	return throttled
}

export function withBatchedUpdates<T extends AnyFunc>(func: T): T {
	return ((...args: Parameters<T>) => {
		unstable_batchedUpdates(() => func(...args))
	}) as T
}

export function withBatchedUpdatesThrottled<T extends AnyFunc>(func: T): T {
	const throttled = throttleRAF((...args: unknown[]) => {
		unstable_batchedUpdates(() => func(...(args as Parameters<T>)))
	})

	const wrapped = ((...args: Parameters<T>) => {
		throttled(...args)
	}) as T

	Object.assign(wrapped, {
		cancel: throttled.cancel,
		flush: throttled.flush,
	})

	return wrapped
}
