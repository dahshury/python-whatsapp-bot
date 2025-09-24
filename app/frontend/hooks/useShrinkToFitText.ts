import * as React from "react";

export function useShrinkToFitText(enabled: boolean) {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const textRef = React.useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = React.useState(1);

	const recompute = React.useCallback(() => {
		if (!enabled) return;
		const container = containerRef.current;
		const textEl = textRef.current;
		if (!container || !textEl) return;
		textEl.style.transform = "";
		textEl.style.transformOrigin = "left center";
		const available = container.clientWidth;
		const needed = textEl.scrollWidth;
		if (available > 0 && needed > available) {
			const raw = available / needed;
			const clamped = Math.max(0.6, Math.min(1, raw));
			setScale(clamped);
		} else {
			setScale(1);
		}
	}, [enabled]);

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

	React.useEffect(() => {
		if (!enabled) return;
		const id = setTimeout(() => recompute(), 0);
		return () => clearTimeout(id);
	}, [recompute, enabled]);

	return { containerRef, textRef, scale, recompute } as const;
}
