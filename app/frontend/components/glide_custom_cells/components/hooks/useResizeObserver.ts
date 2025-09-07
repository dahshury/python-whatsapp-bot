import { useCallback, useEffect, useRef, useState } from "react";
import type { GridDimensions } from "../core/types";
import { BrowserUtils } from "../utils/browserUtils";

interface UseResizeObserverOptions {
	disabled?: boolean;
	debounceDelay?: number;
}

export function useResizeObserver<T extends HTMLElement>(
	options: UseResizeObserverOptions = {},
): [React.RefObject<T | null>, GridDimensions | null] {
	const { disabled = false, debounceDelay = 100 } = options;
	const elementRef = useRef<T>(null);
	const [dimensions, setDimensions] = useState<GridDimensions | null>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const updateDimensions = useCallback(
		(entries: ResizeObserverEntry[]) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				const entry = entries[0];
				if (entry) {
					const { width, height } = entry.contentRect;
					setDimensions({ width, height });
				}
			}, debounceDelay);
		},
		[debounceDelay],
	);

	useEffect(() => {
		const element = elementRef.current;
		if (!element || disabled) return;

		const capabilities = BrowserUtils.getBrowserCapabilities();
		if (!capabilities.supportsResizeObserver) {
			const handleResize = () => {
				const rect = element.getBoundingClientRect();
				setDimensions({ width: rect.width, height: rect.height });
			};

			window.addEventListener("resize", handleResize);
			handleResize();

			return () => {
				window.removeEventListener("resize", handleResize);
			};
		}

		resizeObserverRef.current = new ResizeObserver(updateDimensions);
		resizeObserverRef.current.observe(element);

		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect();
				resizeObserverRef.current = null;
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, [disabled, updateDimensions]);

	return [elementRef, dimensions];
}

export function useElementSize<T extends HTMLElement>(
	elementRef: React.RefObject<T>,
): GridDimensions | null {
	const [dimensions, setDimensions] = useState<GridDimensions | null>(null);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;

		const capabilities = BrowserUtils.getBrowserCapabilities();

		if (!capabilities.supportsResizeObserver) {
			const updateSize = () => {
				const rect = element.getBoundingClientRect();
				setDimensions({ width: rect.width, height: rect.height });
			};

			updateSize();
			window.addEventListener("resize", updateSize);

			return () => {
				window.removeEventListener("resize", updateSize);
			};
		}

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				const { width, height } = entry.contentRect;
				setDimensions({ width, height });
			}
		});

		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	}, [elementRef]);

	return dimensions;
}
