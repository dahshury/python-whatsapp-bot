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
		setEditorOpen(true);
		setTimeout(() => setShouldLoadEditor(true), 50);
	}, []);

	const closeEditor = useCallback(() => {
		setEditorOpen(false);
		setShouldLoadEditor(false);
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
