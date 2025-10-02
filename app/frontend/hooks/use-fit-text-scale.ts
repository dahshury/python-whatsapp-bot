"use client";

import * as React from "react";

interface UseFitTextScaleOptions {
	minScale?: number; // minimum scale factor
	maxScale?: number; // maximum scale factor
	paddingPx?: number; // horizontal padding to reserve inside container
}

interface UseFitTextScaleResult {
	containerRef: React.RefObject<HTMLDivElement | null>;
	contentRef: React.RefObject<HTMLSpanElement | null>;
	scale: number;
	fontSizePx: number;
}

// Measures the width of the content and scales it down to fit within the container.
// Works with single-line text and respects container's available width.
export function useFitTextScale({
	minScale = 0.6,
	maxScale = 1,
	paddingPx: _paddingPx = 8,
}: UseFitTextScaleOptions = {}): UseFitTextScaleResult {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const contentRef = React.useRef<HTMLSpanElement>(null);
	const [scale, setScale] = React.useState(1);
	const [fontSizePx, setFontSizePx] = React.useState(0);

	const compute = React.useCallback(() => {
		try {
			const container = containerRef.current;
			const content = contentRef.current;
			if (!container || !content) return;

			// Measure available width minus actual computed paddings
			const containerRect = container.getBoundingClientRect();
			const cs = getComputedStyle(container);
			const padL = Number.parseFloat(cs.paddingLeft || "0");
			const padR = Number.parseFloat(cs.paddingRight || "0");
			const available = Math.max(0, containerRect.width - (padL + padR));

			// Temporarily clear inline fontSize to measure at CSS-defined size
			const prevFontSize = content.style.fontSize;
			content.style.fontSize = "";

			// Use scrollWidth for raw text width
			const needed = content.scrollWidth;
			if (needed <= 0 || available <= 0) return;

			const raw = available / needed;
			const target = Math.min(maxScale, Math.max(minScale, raw));

			setScale(target);
			// Only apply scaled font size if we need to scale DOWN. Otherwise, let CSS control size.
			if (raw < 1) {
				const computed = getComputedStyle(content);
				const baseFont = Number.parseFloat(computed.fontSize || "16");
				if (Number.isFinite(baseFont)) {
					setFontSizePx(baseFont * target);
				}
			} else {
				setFontSizePx(0);
			}
			// Restore
			content.style.fontSize = prevFontSize;
		} catch {}
	}, [minScale, maxScale]);

	React.useEffect(() => {
		compute();
		const onResize = () => compute();
		const onOrientation = () => compute();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onOrientation);
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onOrientation);
		};
	}, [compute]);

	// Recompute when content text changes, sizes change, or theme/fonts change
	React.useEffect(() => {
		const el = contentRef.current;
		const container = containerRef.current;
		if (!el) return;
		let mo: MutationObserver | null = null;
		let roContent: ResizeObserver | null = null;
		let roContainer: ResizeObserver | null = null;
		let htmlObserver: MutationObserver | null = null;
		let fontLoadingHandler: (() => void) | null = null;
		let fontDoneHandler: (() => void) | null = null;
		try {
			mo = new MutationObserver(() => compute());
			mo.observe(el, { characterData: true, subtree: true, childList: true });
		} catch {}
		try {
			if ("ResizeObserver" in window) {
				roContent = new ResizeObserver(() => compute());
				roContent.observe(el);
				if (container) {
					roContainer = new ResizeObserver(() => compute());
					roContainer.observe(container);
				}
			}
		} catch {}
		try {
			htmlObserver = new MutationObserver(() => compute());
			htmlObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
		} catch {}
		try {
			const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
			if (fonts?.addEventListener) {
				fontLoadingHandler = () => compute();
				fontDoneHandler = () => compute();
				fonts.addEventListener("loading", fontLoadingHandler as EventListener);
				fonts.addEventListener("loadingdone", fontDoneHandler as EventListener);
			}
		} catch {}
		return () => {
			mo?.disconnect();
			roContent?.disconnect();
			roContainer?.disconnect();
			htmlObserver?.disconnect();
			try {
				const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
				if (fonts?.removeEventListener) {
					if (fontLoadingHandler)
						fonts.removeEventListener(
							"loading",
							fontLoadingHandler as EventListener,
						);
					if (fontDoneHandler)
						fonts.removeEventListener(
							"loadingdone",
							fontDoneHandler as EventListener,
						);
				}
			} catch {}
		};
	}, [compute]);

	return { containerRef, contentRef, scale, fontSizePx };
}
