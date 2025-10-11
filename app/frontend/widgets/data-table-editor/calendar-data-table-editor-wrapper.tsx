"use client";

import type { CalendarEvent as DataTableCalendarEvent } from "@widgets/data-table-editor/types";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo } from "react";
import type { CalendarEvent } from "@/entities/event";
import { filterEventsForDataTable, transformEventsForDataTable } from "@/processes/calendar/calendar-events.process";
import { GridLoadingState } from "@/shared/libs/data-grid/components/ui/GridLoadingState";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";

// Lazy load DataTableEditor to improve initial performance
const LazyDataTableEditor = dynamic(
	() =>
		import("@/widgets/data-table-editor/DataTableEditor").then((mod) => ({
			default: mod.DataTableEditor,
		})),
	{
		ssr: false,
		loading: () => <GridLoadingState loadingText="Loading editor..." showSkeleton={false} height={180} />,
	}
);

interface CalendarDataTableEditorWrapperProps {
	editorOpen: boolean;
	shouldLoadEditor: boolean;
	selectedDateRange: { start: string; end: string } | null;
	events: CalendarEvent[];
	freeRoam: boolean;
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	isLocalized?: boolean;
	slotDurationHours: number;
	onOpenChange: (open: boolean) => void;
	onEventAdded: (event: DataTableCalendarEvent) => void;
	onEventModified: (eventId: string, event: DataTableCalendarEvent) => void;
	onEventCancelled: (eventId: string) => void;
	onSave: () => Promise<void>;
	closeEditor: () => void;
	setShouldLoadEditor: (load: boolean) => void;
}

export function CalendarDataTableEditorWrapper({
	editorOpen,
	shouldLoadEditor,
	selectedDateRange,
	events,
	freeRoam,
	calendarRef,
	isLocalized,
	slotDurationHours,
	onOpenChange,
	onEventAdded,
	onEventModified,
	onEventCancelled,
	onSave,
	closeEditor,
	setShouldLoadEditor,
}: CalendarDataTableEditorWrapperProps) {
	// Keep mounted briefly after close to allow exit animation
	const keepMounted = React.useRef(false);
	const [renderOpen, setRenderOpen] = React.useState(editorOpen);

	React.useEffect(() => {
		if (editorOpen) {
			keepMounted.current = true;
			setRenderOpen(true);
			return undefined;
		}
		if (keepMounted.current) {
			// Delay unmount to let framer-motion exit run
			const t = setTimeout(() => {
				setRenderOpen(false);
				keepMounted.current = false;
			}, 260); // match DataTableEditor motion exit duration (~250ms)
			return () => clearTimeout(t);
		}
		setRenderOpen(false);
		return undefined;
	}, [editorOpen]);
	// Always compute mapped events so the grid has data immediately on open
	const mappedEvents = useMemo(
		() => transformEventsForDataTable(filterEventsForDataTable(events, "data-table", freeRoam)),
		[events, freeRoam]
	);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			// Ignore redundant updates to avoid render loops
			if (open === editorOpen) return;
			onOpenChange(open);
			if (!open) setShouldLoadEditor(false);
		},
		[editorOpen, onOpenChange, setShouldLoadEditor]
	);

	const handleSave = useCallback(async () => {
		await onSave();
		closeEditor();
	}, [onSave, closeEditor]);

	// Avoid mounting the heavy editor when completely unused
	if (!renderOpen && !shouldLoadEditor) return null;

	return (
		<LazyDataTableEditor
			open={editorOpen}
			onOpenChange={handleOpenChange}
			slotDurationHours={slotDurationHours}
			freeRoam={freeRoam}
			data={[]}
			calendarRef={calendarRef || null}
			onEventAdded={onEventAdded}
			onEventModified={onEventModified}
			onEventCancelled={onEventCancelled}
			events={mappedEvents}
			selectedDateRange={selectedDateRange}
			isLocalized={isLocalized ?? false}
			onSave={handleSave}
			onEventClick={() => {}}
		/>
	);
}
