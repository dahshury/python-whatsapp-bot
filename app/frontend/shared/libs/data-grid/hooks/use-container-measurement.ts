import { type RefObject, useEffect, useRef, useState } from "react";

type UseContainerMeasurementOptions = {
	throttleMs?: number;
	minDelta?: number;
};

type UseContainerMeasurementResult = {
	containerRef: RefObject<HTMLDivElement | null>;
	containerWidth: number | undefined;
};

const DEFAULT_THROTTLE_MS = 50;
const DEFAULT_MIN_DELTA = 2;

function createUpdateWidth(
	setContainerWidth: (width: number) => void,
	lastWidthRef: React.MutableRefObject<number | undefined>
) {
	return (width: number) => {
		lastWidthRef.current = width;
		setContainerWidth(width);
	};
}

function shouldUpdateWidth(
	width: number,
	lastWidth: number | undefined,
	minDelta: number
): boolean {
	if (!Number.isFinite(width) || width <= 0) {
		return false;
	}
	const prev = lastWidth ?? -1;
	return Math.abs(width - prev) >= minDelta;
}

type ScheduleUpdateContext = {
	rafId: React.MutableRefObject<number | null>;
	lastUpdateTs: React.MutableRefObject<number>;
	throttleMs: number;
};

function scheduleUpdate(
	update: () => void,
	context: ScheduleUpdateContext,
	now: number
) {
	if (now - context.lastUpdateTs.current >= context.throttleMs) {
		context.lastUpdateTs.current = now;
		update();
	} else {
		if (context.rafId.current) {
			cancelAnimationFrame(context.rafId.current);
		}
		context.rafId.current = requestAnimationFrame(() => {
			context.lastUpdateTs.current = performance.now();
			update();
		});
	}
}

export function useContainerMeasurement(
	options: UseContainerMeasurementOptions = {}
): UseContainerMeasurementResult {
	const { throttleMs = DEFAULT_THROTTLE_MS, minDelta = DEFAULT_MIN_DELTA } =
		options;

	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number | undefined>(
		undefined
	);
	const lastWidthRef = useRef<number | undefined>(undefined);
	const rafIdRef = useRef<number | null>(null);
	const lastUpdateTsRef = useRef<number>(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}

		const updateWidth = createUpdateWidth(setContainerWidth, lastWidthRef);

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = Math.round(entry.contentRect.width);
				if (!shouldUpdateWidth(width, lastWidthRef.current, minDelta)) {
					continue;
				}
				scheduleUpdate(
					() => updateWidth(width),
					{ rafId: rafIdRef, lastUpdateTs: lastUpdateTsRef, throttleMs },
					performance.now()
				);
			}
		});

		observer.observe(el);

		// Initial measure
		try {
			const w = Math.round(el.offsetWidth || 0);
			if (w > 0) {
				updateWidth(w);
			}
		} catch {
			// Silently handle initial measurement errors
		}

		return () => {
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
			}
			observer.disconnect();
		};
	}, [throttleMs, minDelta]);

	return { containerRef, containerWidth };
}
