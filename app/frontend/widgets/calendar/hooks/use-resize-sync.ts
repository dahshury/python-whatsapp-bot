import type FullCalendar from "@fullcalendar/react";
import { useLayoutEffect, useRef } from "react";

export function useResizeSync(
	calendarRef: React.RefObject<FullCalendar | null>,
	containerRef: React.RefObject<HTMLDivElement | null>
) {
	// Track last measured size to avoid redundant updateSize() calls that can
	// trigger ResizeObserver feedback loops on some layouts.
	const lastSizeRef = useRef<{ w: number; h: number } | null>(null);

	useLayoutEffect(() => {
		if (!(calendarRef.current && containerRef.current)) {
			return;
		}

		const api = calendarRef.current?.getApi?.();
		if (api && typeof api.updateSize === "function") {
			requestAnimationFrame(() => {
				api.updateSize();
				const rect = containerRef.current?.getBoundingClientRect?.();
				if (rect) {
					lastSizeRef.current = {
						w: Math.round(rect.width),
						h: Math.round(rect.height),
					};
				}
			});
		}

		const observers: ResizeObserver[] = [];
		let resizeScheduled = false;
		const measure = () => {
			const rect = containerRef.current?.getBoundingClientRect?.();
			return rect
				? { w: Math.round(rect.width), h: Math.round(rect.height) }
				: null;
		};

		const applyUpdateSize = (nextSize: { w: number; h: number } | null) => {
			const apiNow = calendarRef.current?.getApi?.();
			if (apiNow && typeof apiNow.updateSize === "function") {
				apiNow.updateSize();
				const after = measure();
				lastSizeRef.current = after || nextSize || lastSizeRef.current;
			}
		};

		const scheduleUpdateSize = () => {
			if (resizeScheduled) {
				return;
			}
			resizeScheduled = true;
			requestAnimationFrame(() => {
				const current = measure();
				if (!current) {
					resizeScheduled = false;
					return;
				}
				const last = lastSizeRef.current;
				const changed = !(last && last.w === current.w && last.h === current.h);
				if (changed) {
					applyUpdateSize(current);
				}
				resizeScheduled = false;
			});
		};
		const resizeObserver = new ResizeObserver(() => {
			scheduleUpdateSize();
		});
		resizeObserver.observe(containerRef.current);
		observers.push(resizeObserver);

		const handleWindowResize = () => {
			scheduleUpdateSize();
		};
		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				scheduleUpdateSize();
				requestAnimationFrame(() => scheduleUpdateSize());
			}
		};
		const handleFocus = () => {
			requestAnimationFrame(() => scheduleUpdateSize());
		};
		window.addEventListener("resize", handleWindowResize);
		document.addEventListener("visibilitychange", handleVisibility);
		window.addEventListener("focus", handleFocus);

		return () => {
			for (const observer of observers) {
				observer.disconnect();
			}
			window.removeEventListener("resize", handleWindowResize);
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("focus", handleFocus);
		};
	}, [calendarRef, containerRef]);
}
