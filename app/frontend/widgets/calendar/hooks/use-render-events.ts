import {
	profileTimeEnd,
	profileTimeStart,
} from "@shared/libs/utils/calendar-profiler";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/entities/event";
import { getIsDragging } from "../state/dragging";

/**
 * Keeps a stable set of render events during drag operations to avoid snap-back
 * when external event arrays update mid-drag.
 */
const computeEventsSignature = (events: CalendarEvent[]): string => {
	try {
		let hash = `len:${events?.length ?? 0}`;
		for (const e of events) {
			const type = (e.extendedProps?.type ?? "").toString();
			const cancelled = e.extendedProps?.cancelled ? "1" : "0";
			const vacation = e.extendedProps?.__vacation ? "1" : "0";
			hash += `|${e.id}|${e.start}|${e.end ?? ""}|${e.display ?? ""}|${
				e.allDay ? "1" : "0"
			}|${type}|${cancelled}|${vacation}`;
		}
		return hash;
	} catch {
		return `len:${events?.length ?? 0}`;
	}
};

export function useRenderEvents(
	sanitizedEvents: CalendarEvent[]
): CalendarEvent[] {
	const frozenEventsRef = useRef<CalendarEvent[]>(sanitizedEvents);
	const [renderEvents, setRenderEvents] =
		useState<CalendarEvent[]>(sanitizedEvents);

	// Create a cheap, stable signature for the events array so we can
	// ignore redundant identity changes with equivalent content.
	const lastSignatureRef = useRef<string | undefined>(undefined);
	const lastIsDraggingRef = useRef<boolean | undefined>(undefined);

	// Helper to check if initial empty state should be suppressed
	const shouldSuppressInitialUpdate = useCallback(
		(
			lastSignature: string | undefined,
			lastIsDragging: boolean | undefined,
			isDragging: boolean,
			eventsLength: number
		): boolean =>
			lastSignature === undefined &&
			lastIsDragging === undefined &&
			!isDragging &&
			eventsLength === 0,
		[]
	);

	// Helper to determine if update is needed
	const shouldUpdateRenderEvents = useCallback(
		(
			lastIsDragging: boolean | undefined,
			isDragging: boolean,
			nextSignature: string,
			lastSignature: string | undefined
		): boolean => {
			if (lastIsDragging === undefined) {
				// First run
				return true;
			}
			if (isDragging !== lastIsDragging) {
				// Drag state toggled
				return true;
			}
			if (!isDragging && nextSignature !== lastSignature) {
				// Only update on content changes when not dragging
				return true;
			}
			return false;
		},
		[]
	);

	// Helper to update render events based on drag state
	const updateRenderEventsForDragState = useCallback(
		(isDragging: boolean, lastIsDragging: boolean | undefined): void => {
			if (isDragging && !lastIsDragging) {
				// Freeze the current input events at drag start
				frozenEventsRef.current = sanitizedEvents;
				setRenderEvents(frozenEventsRef.current);
			} else if (isDragging) {
				// Maintain frozen events during drag
				setRenderEvents(frozenEventsRef.current);
			} else {
				// Not dragging: propagate latest sanitized events
				setRenderEvents(sanitizedEvents);
				lastSignatureRef.current = computeEventsSignature(sanitizedEvents);
			}
		},
		[sanitizedEvents]
	);

	useEffect(() => {
		const isDragging = getIsDragging();
		const nextSignature = computeEventsSignature(sanitizedEvents);

		const lastSignature = lastSignatureRef.current;
		const lastIsDragging = lastIsDraggingRef.current;

		// Suppress initial empty events update in dev to avoid redundant logs/renders on refresh
		if (
			shouldSuppressInitialUpdate(
				lastSignature,
				lastIsDragging,
				isDragging,
				sanitizedEvents?.length ?? 0
			)
		) {
			lastSignatureRef.current = nextSignature;
			lastIsDraggingRef.current = isDragging;
			return;
		}

		// Determine whether we actually need to update visible events
		if (
			!shouldUpdateRenderEvents(
				lastIsDragging,
				isDragging,
				nextSignature,
				lastSignature
			)
		) {
			return;
		}

		const t0 = profileTimeStart("useRenderEvents.update", {
			isDragging,
			prevSig: lastSignature || "",
			nextSig: nextSignature,
		});

		updateRenderEventsForDragState(isDragging, lastIsDragging);

		lastIsDraggingRef.current = isDragging;

		profileTimeEnd("useRenderEvents.update", t0, {
			count: sanitizedEvents.length,
		});
	}, [
		sanitizedEvents,
		shouldSuppressInitialUpdate,
		shouldUpdateRenderEvents,
		updateRenderEventsForDragState,
	]);

	return renderEvents;
}
