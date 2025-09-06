"use client";

import * as React from "react";

interface UseLongPressRepeatOptions {
	startDelayMs?: number;
	intervalMs?: number;
	disabled?: boolean;
}

/**
 * Adds press-and-hold auto-repeat behavior to an action.
 * - Repeats the action at a fixed interval after a configurable hold delay
 * - Stops on pointer up/leave/cancel or blur/unmount
 */
export function useLongPressRepeat(
	action: () => void,
	options: UseLongPressRepeatOptions = {},
) {
	const { startDelayMs = 3000, intervalMs = 333, disabled = false } = options;

	const actionRef = React.useRef(action);
	const disabledRef = React.useRef(disabled);
	const holdTimeoutRef = React.useRef<number | null>(null);
	const repeatIntervalRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		actionRef.current = action;
	}, [action]);

	React.useEffect(() => {
		disabledRef.current = disabled;
	}, [disabled]);

	const clearTimers = React.useCallback(() => {
		if (holdTimeoutRef.current !== null) {
			window.clearTimeout(holdTimeoutRef.current);
			holdTimeoutRef.current = null;
		}
		if (repeatIntervalRef.current !== null) {
			window.clearInterval(repeatIntervalRef.current);
			repeatIntervalRef.current = null;
		}
	}, []);

	const start = React.useCallback(
		(target: Element, pointerId?: number) => {
			if (disabledRef.current) return;
			if (typeof pointerId === "number") {
				try {
					target.setPointerCapture(pointerId);
				} catch {}
			}

			holdTimeoutRef.current = window.setTimeout(() => {
				if (disabledRef.current) return;
				// Initial tick immediately after delay, then fixed interval
				actionRef.current();
				repeatIntervalRef.current = window.setInterval(() => {
					if (disabledRef.current) {
						clearTimers();
						return;
					}
					actionRef.current();
				}, intervalMs);
			}, startDelayMs);
		},
		[clearTimers, intervalMs, startDelayMs],
	);

	const stop = React.useCallback(
		(target?: Element, pointerId?: number) => {
			if (target && typeof pointerId === "number") {
				try {
					target.releasePointerCapture(pointerId);
				} catch {}
			}
			clearTimers();
		},
		[clearTimers],
	);

	const handlers = React.useMemo(
		() => ({
			onPointerDown: (e: React.PointerEvent) => {
				// Only respond to primary button/touch/pen
				if (e.button !== 0) return;
				if (disabledRef.current) return;
				start(e.currentTarget, e.pointerId);
			},
			onPointerUp: (e: React.PointerEvent) => {
				stop(e.currentTarget, e.pointerId);
			},
			onPointerLeave: (e: React.PointerEvent) => {
				stop(e.currentTarget, e.pointerId);
			},
			onPointerCancel: (e: React.PointerEvent) => {
				stop(e.currentTarget, e.pointerId);
			},
			onBlur: () => {
				stop();
			},
		}),
		[start, stop],
	);

	React.useEffect(() => {
		return () => {
			clearTimers();
		};
	}, [clearTimers]);

	return handlers;
}
