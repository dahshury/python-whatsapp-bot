"use client";

import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

const TARGET_SCALE_TOLERANCE = 0.02;

type UseFitTextScaleOptions = {
	minScale?: number; // minimum scale factor
	maxScale?: number; // maximum scale factor
	paddingPx?: number; // horizontal padding to reserve inside container
};

type UseFitTextScaleResult = {
	containerRef: RefObject<HTMLDivElement | null>;
	contentRef: RefObject<HTMLSpanElement | null>;
	scale: number;
	fontSizePx: number;
};

function setupMutationObserver(
	element: HTMLElement,
	callback: () => void
): MutationObserver | null {
	try {
		const observer = new MutationObserver(callback);
		observer.observe(element, {
			characterData: true,
			subtree: true,
			childList: true,
		});
		return observer;
	} catch {
		// MutationObserver not available or initialization failed
		return null;
	}
}

function setupContentResizeObserver(
	element: HTMLElement,
	callback: () => void
): ResizeObserver | null {
	try {
		if ("ResizeObserver" in window) {
			const observer = new ResizeObserver(callback);
			observer.observe(element);
			return observer;
		}
	} catch {
		// ResizeObserver not available or initialization failed
	}
	return null;
}

function setupContainerResizeObserver(
	element: HTMLElement,
	callback: () => void
): ResizeObserver | null {
	try {
		if ("ResizeObserver" in window) {
			const observer = new ResizeObserver(callback);
			observer.observe(element);
			return observer;
		}
	} catch {
		// ResizeObserver not available or initialization failed
	}
	return null;
}

function setupHtmlAttributeObserver(
	callback: () => void
): MutationObserver | null {
	try {
		const observer = new MutationObserver(callback);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return observer;
	} catch {
		// HTML attribute observer setup failed
		return null;
	}
}

function setupFontLoadingObserver(callback: () => void): {
	loadingHandler: (() => void) | null;
	doneHandler: (() => void) | null;
} {
	try {
		const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
		if (fonts?.addEventListener) {
			const loadingHandler = callback;
			const doneHandler = callback;
			fonts.addEventListener("loading", loadingHandler as EventListener);
			fonts.addEventListener("loadingdone", doneHandler as EventListener);
			return { loadingHandler, doneHandler };
		}
	} catch {
		// Font loading observer setup failed
	}
	return { loadingHandler: null, doneHandler: null };
}

function removeFontLoadingObservers(
	loadingHandler: (() => void) | null,
	doneHandler: (() => void) | null
): void {
	try {
		const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
		if (fonts?.removeEventListener) {
			if (loadingHandler) {
				fonts.removeEventListener("loading", loadingHandler as EventListener);
			}
			if (doneHandler) {
				fonts.removeEventListener("loadingdone", doneHandler as EventListener);
			}
		}
	} catch {
		// Font loading observer cleanup failed
	}
}

function computeScaleFactor(
	available: number,
	needed: number,
	minScale: number,
	maxScale: number
): number {
	if (needed <= 0 || available <= 0) {
		return 1;
	}
	const raw = available / needed;
	return Math.min(maxScale, Math.max(minScale, raw));
}

function calculateFontSize(
	scale: number,
	baseFont: number,
	setFontSizePx: (size: number) => void
): void {
	// If target is approximately 1, avoid unnecessary inline style to let CSS control size.
	if (Math.abs(scale - 1) < TARGET_SCALE_TOLERANCE) {
		setFontSizePx(0);
	} else {
		setFontSizePx(baseFont * scale);
	}
}

type ComputeScaleOptions = {
	containerRef: RefObject<HTMLDivElement | null>;
	contentRef: RefObject<HTMLSpanElement | null>;
	setScale: (scale: number) => void;
	setFontSizePx: (size: number) => void;
	minScale: number;
	maxScale: number;
};

function computeScale(options: ComputeScaleOptions): void {
	const {
		containerRef,
		contentRef,
		setScale,
		setFontSizePx,
		minScale,
		maxScale,
	} = options;
	try {
		const container = containerRef.current;
		const content = contentRef.current;
		if (!(container && content)) {
			return;
		}

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
		const target = computeScaleFactor(available, needed, minScale, maxScale);

		setScale(target);
		// Apply scaled font size for both downscale and upscale cases so text can grow to fill width.
		const computed = getComputedStyle(content);
		const baseFont = Number.parseFloat(computed.fontSize || "16");
		if (Number.isFinite(baseFont)) {
			calculateFontSize(target, baseFont, setFontSizePx);
		}
		// Restore
		content.style.fontSize = prevFontSize;
	} catch {
		// Scale computation failed, keeping previous state
	}
}

// Measures the width of the content and scales it down to fit within the container.
// Works with single-line text and respects container's available width.
export function useFitTextScale({
	minScale = 0.6,
	maxScale = 1,
	paddingPx: _paddingPx = 8,
}: UseFitTextScaleOptions = {}): UseFitTextScaleResult {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLSpanElement>(null);
	const [scale, setScale] = useState(1);
	const [fontSizePx, setFontSizePx] = useState(0);

	const compute = useCallback(() => {
		computeScale({
			containerRef,
			contentRef,
			setScale,
			setFontSizePx,
			minScale,
			maxScale,
		});
	}, [minScale, maxScale]);

	useEffect(() => {
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
	useEffect(() => {
		const el = contentRef.current;
		const container = containerRef.current;
		if (!el) {
			return;
		}

		const mo = setupMutationObserver(el, () => compute());
		const roContent = setupContentResizeObserver(el, () => compute());
		const roContainer =
			container && container
				? setupContainerResizeObserver(container, () => compute())
				: null;
		const htmlObserver = setupHtmlAttributeObserver(() => compute());
		const { loadingHandler, doneHandler } = setupFontLoadingObserver(() =>
			compute()
		);

		return () => {
			mo?.disconnect();
			roContent?.disconnect();
			roContainer?.disconnect();
			htmlObserver?.disconnect();
			removeFontLoadingObservers(loadingHandler, doneHandler);
		};
	}, [compute]);

	return { containerRef, contentRef, scale, fontSizePx };
}
