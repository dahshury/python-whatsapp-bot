import { useCallback, useState } from "react";
import type { CalendarEvent } from "@/types/calendar";

interface DateRange {
	start: string;
	end: string;
}

export function useCalendarDataTableEditor() {
	const [editorOpen, setEditorOpen] = useState(false);
	const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(
		null,
	);
	const [shouldLoadEditor, setShouldLoadEditor] = useState(false);

	const openEditor = useCallback((dateRange: DateRange) => {
		setSelectedDateRange(dateRange);
		// Load immediately to avoid empty state and flicker on rapid re-opens
		setShouldLoadEditor(true);
		setEditorOpen(true);
	}, []);

	const closeEditor = useCallback(() => {
		setEditorOpen(false);
		// Keep shouldLoadEditor true after the first load to avoid remount flicker
	}, []);

	const handleEditReservation = useCallback(
		(event: CalendarEvent) => {
			openEditor({
				start: event.start,
				end: event.end,
			});
		},
		[openEditor],
	);

	return {
		editorOpen,
		selectedDateRange,
		shouldLoadEditor,
		setEditorOpen,
		setShouldLoadEditor,
		openEditor,
		closeEditor,
		handleEditReservation,
	};
}
