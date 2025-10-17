import { useCallback } from "react";
import type { CalendarEvent } from "@/entities/event";

type UseCalendarDetailsProps = {
	events: CalendarEvent[];
	dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void };
};

type UseCalendarDetailsResult = {
	handleViewDetails: (eventId: string) => void;
};

export function useCalendarDetails({
	events,
	dataTableEditor,
}: UseCalendarDetailsProps): UseCalendarDetailsResult {
	const handleViewDetails = useCallback(
		(eventId: string) => {
			const event = events.find((e) => e.id === eventId);
			if (event) {
				dataTableEditor.handleEditReservation(event);
			}
		},
		[events, dataTableEditor]
	);

	return { handleViewDetails };
}
