import * as React from "react";

export function useShrinkToFitText(enabled: boolean) {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const textRef = React.useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = React.useState(1);
	const [isMeasured, setIsMeasured] = React.useState(false);
	const isFirstMeasurement = React.useRef(true);

	const recompute = React.useCallback(() => {
		if (!enabled) {
			setIsMeasured(true);
			return;
		}
		const container = containerRef.current;
		const textEl = textRef.current;
		if (!container || !textEl) return;

		// Reset transform to measure natural size
		textEl.style.transform = "";
		textEl.style.transformOrigin = "left center";

		// Force layout recalculation
		void textEl.offsetWidth;

		const available = container.clientWidth;
		const needed = textEl.scrollWidth;

		if (available > 0 && needed > available) {
			const raw = available / needed;
			const clamped = Math.max(0.6, Math.min(1, raw));
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
	React.useLayoutEffect(() => {
		recompute();
	}, [recompute]);

	React.useEffect(() => {
		if (!enabled) return;
		const handle = () => recompute();
		window.addEventListener("resize", handle);
		return () => window.removeEventListener("resize", handle);
	}, [recompute, enabled]);

	React.useEffect(() => {
		if (!enabled) return;
		const container = containerRef.current;
		if (!container) return;
		const ro = new ResizeObserver(() => recompute());
		ro.observe(container);
		return () => ro.disconnect();
	}, [recompute, enabled]);

	return { containerRef, textRef, scale, recompute, isMeasured } as const;
}
