import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

const MIN_SCALE = 0.6;

export function useShrinkToFitText(enabled: boolean) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const textRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState(1);
	const [isMeasured, setIsMeasured] = useState(false);
	const isFirstMeasurement = useRef(true);

	const recompute = useCallback(() => {
		if (!enabled) {
			setIsMeasured(true);
			return;
		}
		const container = containerRef.current;
		const textEl = textRef.current;
		if (!(container && textEl)) {
			return;
		}

		// Reset transform to measure natural size
		textEl.style.transform = "";
		textEl.style.transformOrigin = "left center";

		// Force layout recalculation
		// biome-ignore lint/nursery/noUnusedExpressions: Reading offsetWidth triggers layout recalculation
		textEl.offsetWidth;

		const available = container.clientWidth;
		const needed = textEl.scrollWidth;

		if (available > 0 && needed > available) {
			const raw = available / needed;
			const clamped = Math.max(MIN_SCALE, Math.min(1, raw));
			setScale(clamped);
		} else {
			setScale(1);
		}

		// Mark as measured after first calculation
		if (isFirstMeasurement.current) {
			isFirstMeasurement.current = false;
			setIsMeasured(true);
		}
	}, [enabled]);

	// Use useLayoutEffect for synchronous measurement before paint
	useLayoutEffect(() => {
		recompute();
	}, [recompute]);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		const handle = () => recompute();
		window.addEventListener("resize", handle);
		return () => window.removeEventListener("resize", handle);
	}, [recompute, enabled]);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		const container = containerRef.current;
		if (!container) {
			return;
		}
		const ro = new ResizeObserver(() => recompute());
		ro.observe(container);
		return () => ro.disconnect();
	}, [recompute, enabled]);

	return { containerRef, textRef, scale, recompute, isMeasured } as const;
}
