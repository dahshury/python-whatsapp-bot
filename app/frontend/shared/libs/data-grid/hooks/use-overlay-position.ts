import { type RefObject, useEffect, useState } from "react";

type UseOverlayPositionArgs = {
	containerRef: RefObject<HTMLElement | null>;
	isFullscreen?: boolean;
};

type OverlayPosition = { top: number; left: number } | null;

const PORTAL_ID = "grid-fullscreen-portal";
const FULLSCREEN_SELECTOR = ".glide-grid-fullscreen-container";

function computePosition(
	containerRef: RefObject<HTMLElement | null>,
	setOverlayPosition: (pos: OverlayPosition) => void
): void {
	try {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const rect = el.getBoundingClientRect();
		setOverlayPosition({ top: rect.top, left: rect.right });
	} catch {
		// Silently handle bounding rect computation errors
	}
}

function getScrollTargets(
	containerRef: RefObject<HTMLElement | null>
): Array<EventTarget | null | undefined> {
	return [
		window,
		document,
		containerRef.current,
		typeof document !== "undefined"
			? document.getElementById(PORTAL_ID)
			: undefined,
		typeof document !== "undefined"
			? (document.querySelector(FULLSCREEN_SELECTOR) as HTMLElement | null)
			: undefined,
	];
}

function attachScrollListeners(
	targets: Array<EventTarget | null | undefined>,
	onScroll: () => void
): void {
	for (const target of targets) {
		try {
			if (target && "addEventListener" in target) {
				(target as unknown as Window).addEventListener("scroll", onScroll, {
					capture: true,
					passive: true,
				} as unknown as boolean);
			}
		} catch {
			// Silently handle event listener attachment errors
		}
	}
}

function detachScrollListeners(
	targets: Array<EventTarget | null | undefined>,
	onScroll: () => void
): void {
	for (const target of targets) {
		try {
			if (target && "removeEventListener" in target) {
				(target as unknown as Window).removeEventListener(
					"scroll",
					onScroll,
					true
				);
			}
		} catch {
			// Silently handle event listener removal errors
		}
	}
}

function attachResizeObserver(
	containerRef: RefObject<HTMLElement | null>,
	compute: () => void
): ResizeObserver | null {
	const ro = new ResizeObserver(() => compute());
	try {
		if (containerRef.current) {
			ro.observe(containerRef.current);
		}
		return ro;
	} catch {
		// Silently handle observer attachment errors
		return null;
	}
}

export function useOverlayPosition({
	containerRef,
}: UseOverlayPositionArgs): OverlayPosition {
	const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(null);

	useEffect(() => {
		const compute = () => computePosition(containerRef, setOverlayPosition);
		compute();

		const onScroll = () => compute();
		const onResize = () => compute();

		const scrollTargets = getScrollTargets(containerRef);
		attachScrollListeners(scrollTargets, onScroll);
		window.addEventListener("resize", onResize);

		const ro = attachResizeObserver(containerRef, compute);

		return () => {
			detachScrollListeners(scrollTargets, onScroll);
			window.removeEventListener("resize", onResize);
			if (ro) {
				try {
					ro.disconnect();
				} catch {
					// Silently handle observer disconnection errors
				}
			}
		};
	}, [containerRef]);

	useEffect(() => {
		computePosition(containerRef, setOverlayPosition);
	}, [containerRef]);

	return overlayPosition;
}
