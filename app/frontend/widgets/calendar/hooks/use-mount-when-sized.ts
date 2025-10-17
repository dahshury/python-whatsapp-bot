import type { MutableRefObject } from "react";
import { useEffect, useState } from "react";

/**
 * Defers mount until the container has a measurable size to prevent zoomed-in
 * initial paint (especially on mobile/small viewports).
 */
export function useMountWhenSized(
	containerRef: MutableRefObject<HTMLElement | null>
): boolean {
	const [mountReady, setMountReady] = useState(false);

	useEffect(() => {
		let raf = 0;
		let tries = 0;
		const tick = () => {
			tries += 1;
			try {
				const rect = containerRef.current?.getBoundingClientRect?.();
				if (rect && rect.width > 2 && rect.height > 2) {
					setMountReady(true);
					return;
				}
			} catch {
				// Error handling
			}
			if (tries < 60) {
				raf = requestAnimationFrame(tick);
			} else {
				setMountReady(true);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [containerRef]);

	return mountReady;
}
