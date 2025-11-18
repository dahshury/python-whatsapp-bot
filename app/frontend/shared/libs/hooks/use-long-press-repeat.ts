'use client'

import type { MouseEvent, PointerEvent, TouchEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

type UseLongPressRepeatOptions = {
	startDelayMs?: number
	intervalMs?: number
	disabled?: boolean
}

/**
 * Adds press-and-hold auto-repeat behavior to an action.
 * - Repeats the action at a fixed interval after a configurable hold delay
 * - Stops on pointer up/leave/cancel or blur/unmount
 */
export function useLongPressRepeat(
	action: () => void,
	options: UseLongPressRepeatOptions = {}
) {
	const { startDelayMs = 3000, intervalMs = 333, disabled = false } = options

	const actionRef = useRef(action)
	const disabledRef = useRef(disabled)
	const holdTimeoutRef = useRef<number | null>(null)
	const repeatIntervalRef = useRef<number | null>(null)

	useEffect(() => {
		actionRef.current = action
	}, [action])

	useEffect(() => {
		disabledRef.current = disabled
	}, [disabled])

	const clearTimers = useCallback(() => {
		if (holdTimeoutRef.current !== null) {
			window.clearTimeout(holdTimeoutRef.current)
			holdTimeoutRef.current = null
		}
		if (repeatIntervalRef.current !== null) {
			window.clearInterval(repeatIntervalRef.current)
			repeatIntervalRef.current = null
		}
	}, [])

	const start = useCallback(
		(target: Element, pointerId?: number) => {
			if (disabledRef.current) {
				return
			}
			// Avoid duplicate starts if already scheduled/running
			if (
				holdTimeoutRef.current !== null ||
				repeatIntervalRef.current !== null
			) {
				return
			}
			if (typeof pointerId === 'number') {
				try {
					target.setPointerCapture(pointerId)
				} catch {
					// Pointer capture failed - continue without capture
				}
			}

			holdTimeoutRef.current = window.setTimeout(() => {
				if (disabledRef.current) {
					return
				}
				// Initial tick immediately after delay, then fixed interval
				actionRef.current()
				repeatIntervalRef.current = window.setInterval(() => {
					if (disabledRef.current) {
						clearTimers()
						return
					}
					actionRef.current()
				}, intervalMs)
			}, startDelayMs)
		},
		[clearTimers, intervalMs, startDelayMs]
	)

	const stop = useCallback(
		(target?: Element, pointerId?: number) => {
			if (target && typeof pointerId === 'number') {
				try {
					target.releasePointerCapture(pointerId)
				} catch {
					// Pointer release failed - continue cleanup
				}
			}
			clearTimers()
		},
		[clearTimers]
	)

	const handlers = useMemo(
		() => ({
			onPointerDown: (e: PointerEvent) => {
				// Only respond to primary mouse button; allow touch/pen
				if (e.pointerType === 'mouse' && e.button !== 0) {
					return
				}
				if (disabledRef.current) {
					return
				}
				e.preventDefault()
				start(e.currentTarget, e.pointerId)
			},
			onPointerUp: (e: PointerEvent) => {
				stop(e.currentTarget, e.pointerId)
			},
			onPointerLeave: (e: PointerEvent) => {
				stop(e.currentTarget, e.pointerId)
			},
			onPointerCancel: (e: PointerEvent) => {
				stop(e.currentTarget, e.pointerId)
			},
			onMouseDown: (e: MouseEvent) => {
				if (e.button !== 0) {
					return
				}
				if (disabledRef.current) {
					return
				}
				e.preventDefault()
				start(e.currentTarget as Element)
			},
			onMouseUp: (e: MouseEvent) => {
				stop(e.currentTarget as Element)
			},
			onMouseLeave: (e: MouseEvent) => {
				stop(e.currentTarget as Element)
			},
			onTouchStart: (e: TouchEvent) => {
				if (disabledRef.current) {
					return
				}
				e.preventDefault()
				start(e.currentTarget as Element)
			},
			onTouchEnd: (e: TouchEvent) => {
				stop(e.currentTarget as Element)
			},
			onTouchCancel: (e: TouchEvent) => {
				stop(e.currentTarget as Element)
			},
			onContextMenu: (e: MouseEvent) => {
				e.preventDefault()
			},
			onBlur: () => {
				stop()
			},
		}),
		[start, stop]
	)

	useEffect(
		() => () => {
			clearTimers()
		},
		[clearTimers]
	)

	return handlers
}
