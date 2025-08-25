import dynamic from "next/dynamic";
import type React from "react";
import { GridLoadingState } from "@/components/glide_custom_cells/components/ui/GridLoadingState";
import {
	filterEventsForDataTable,
	transformEventsForDataTable,
} from "@/lib/calendar-event-processor";
import type { CalendarEvent } from "@/types/calendar";
import type { CalendarCoreRef } from "./calendar-core";

// Lazy load DataTableEditor to improve initial performance
const LazyDataTableEditor = dynamic(
	() =>
		import("./data-table-editor").then((mod) => ({
			default: mod.DataTableEditor,
		})),
	{
		ssr: false,
		loading: () => (
			<GridLoadingState loadingText="Loading editor..." showSkeleton={false} height={180} />
		),
	},
);

interface CalendarDataTableEditorWrapperProps {
	editorOpen: boolean;
	shouldLoadEditor: boolean;
	selectedDateRange: { start: string; end: string } | null;
	events: CalendarEvent[];
	freeRoam: boolean;
	calendarRef: React.RefObject<CalendarCoreRef>;
	isRTL: boolean;
	slotDurationHours: number;
	onOpenChange: (open: boolean) => void;
	onEventAdded: (event: any) => void;
	onEventModified: (eventId: string, event: any) => void;
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
	isRTL,
	slotDurationHours,
	onOpenChange,
	onEventAdded,
	onEventModified,
	onEventCancelled,
	onSave,
	closeEditor,
	setShouldLoadEditor,
}: CalendarDataTableEditorWrapperProps) {
	return (
		<LazyDataTableEditor
			open={editorOpen}
			onOpenChange={(open: boolean) => {
				onOpenChange(open);
				if (!open) {
					setShouldLoadEditor(false);
				}
			}}
			slotDurationHours={slotDurationHours}
			freeRoam={freeRoam}
			data={[]}
			calendarRef={calendarRef}
			onEventAdded={onEventAdded}
			onEventModified={onEventModified}
			onEventCancelled={onEventCancelled}
			events={
				shouldLoadEditor
					? transformEventsForDataTable(
							filterEventsForDataTable(events, "data-table", freeRoam),
						)
					: []
			}
			selectedDateRange={selectedDateRange}
			isRTL={isRTL}
			onSave={async () => {
				await onSave();
				closeEditor();
			}}
			onEventClick={() => {}}
		/>
	);
}
