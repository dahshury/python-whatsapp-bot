import { useCallback, useEffect, useRef, useState } from "react";

type SpinnerOptions = {
	showDelayMs?: number;
	minVisibleMs?: number;
};

const DEFAULT_SHOW_DELAY_MS = 150;
const DEFAULT_MIN_VISIBLE_MS = 350;

/**
 * Smooths spinner visibility to avoid flicker:
 * - Delays showing the spinner (showDelayMs) so fast responses never flash it.
 * - Ensures a minimum visible duration (minVisibleMs) once shown before hiding.
 */
export function useSpinnerVisibility(
	isSearching: boolean,
	opts: SpinnerOptions = {}
): boolean {
	const showDelayMs = Math.max(0, opts.showDelayMs ?? DEFAULT_SHOW_DELAY_MS);
	const minVisibleMs = Math.max(0, opts.minVisibleMs ?? DEFAULT_MIN_VISIBLE_MS);

	const [visible, setVisible] = useState(false);
	const showTimerRef = useRef<number | null>(null);
	const hideTimerRef = useRef<number | null>(null);
	const shownAtRef = useRef<number | null>(null);

	const handleHideSpinner = useCallback(() => {
		setVisible(false);
		shownAtRef.current = null;
	}, []);

	const scheduleHideSpinner = useCallback(
		(delayMs: number) => {
			hideTimerRef.current = window.setTimeout(() => {
				handleHideSpinner();
			}, delayMs);
		},
		[handleHideSpinner]
	);

	const handleSearchStarted = useCallback(() => {
		if (!visible) {
			showTimerRef.current = window.setTimeout(() => {
				shownAtRef.current = Date.now();
				setVisible(true);
			}, showDelayMs);
		}
	}, [visible, showDelayMs]);

	const handleSearchStopped = useCallback(() => {
		if (!visible) {
			return;
		}

		const shownAt = shownAtRef.current ?? Date.now();
		const elapsed = Date.now() - shownAt;
		const remain = Math.max(0, minVisibleMs - elapsed);
		if (remain <= 0) {
			handleHideSpinner();
		} else {
			scheduleHideSpinner(remain);
		}
	}, [visible, minVisibleMs, handleHideSpinner, scheduleHideSpinner]);

	const clearTimers = useCallback(() => {
		if (showTimerRef.current) {
			window.clearTimeout(showTimerRef.current);
			showTimerRef.current = null;
		}
		if (hideTimerRef.current) {
			window.clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		clearTimers();

		if (isSearching) {
			handleSearchStarted();
		} else {
			handleSearchStopped();
		}

		return clearTimers;
		// We intentionally include `visible` so the effect responds to state transitions
	}, [isSearching, clearTimers, handleSearchStarted, handleSearchStopped]);

	return visible;
}
