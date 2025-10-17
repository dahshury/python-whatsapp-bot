import { useCallback, useState } from "react";
import type { CalendarEvent } from "@/entities/event";

type DateRange = {
	start: string;
	end: string;
};

type EditorState = {
	open: boolean;
	dateRange: DateRange | null;
	shouldLoad: boolean;
};

export function useCalendarDataTableEditor() {
	const [state, setState] = useState<EditorState>({
		open: false,
		dateRange: null,
		shouldLoad: false,
	});

	const openEditor = useCallback((dateRange: DateRange) => {
		// Update all states atomically to prevent flickering
		setState({
			open: true,
			dateRange,
			shouldLoad: true,
		});
	}, []);

	const closeEditor = useCallback(() => {
		setState((prev) => ({
			...prev,
			open: false,
			// Keep shouldLoad true and preserve dateRange for exit animation
		}));
	}, []);

	const setEditorOpen = useCallback((open: boolean) => {
		setState((prev) => ({ ...prev, open }));
	}, []);

	const setShouldLoadEditor = useCallback((shouldLoad: boolean) => {
		setState((prev) => ({ ...prev, shouldLoad }));
	}, []);

	const handleEditReservation = useCallback(
		(event: CalendarEvent) => {
			openEditor({
				start: event.start,
				end: event.end || event.start,
			});
		},
		[openEditor]
	);

	return {
		editorOpen: state.open,
		selectedDateRange: state.dateRange,
		shouldLoadEditor: state.shouldLoad,
		setEditorOpen,
		setShouldLoadEditor,
		openEditor,
		closeEditor,
		handleEditReservation,
	};
}
