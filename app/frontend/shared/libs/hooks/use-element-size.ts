import type { RefObject } from "react";

import { useEffect, useState } from "react";

export type ElementSize = { width: number; height: number } | null;

export function useElementSize<T extends HTMLElement>(
	elementRef: RefObject<T>
): ElementSize {
	const [dimensions, setDimensions] = useState<ElementSize>(null);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) {
			return;
		}

		const updateSize = () => {
			const rect = element.getBoundingClientRect();
			setDimensions({ width: rect.width, height: rect.height });
		};

		// Try ResizeObserver if available
		if (typeof ResizeObserver !== "undefined") {
			const resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (entry) {
					const { width, height } = entry.contentRect;
					setDimensions({ width, height });
				}
			});
			resizeObserver.observe(element);
			return () => resizeObserver.disconnect();
		}

		// Fallback to window resize
		updateSize();
		window.addEventListener("resize", updateSize);
		return () => window.removeEventListener("resize", updateSize);
	}, [elementRef]);

	return dimensions;
}
