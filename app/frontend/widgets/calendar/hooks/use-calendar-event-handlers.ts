//

import { useCalendarDataTableAdapter } from "@/widgets/calendar/hooks/use-calendar-data-table-adapter";
import { useCalendarDetails } from "@/widgets/calendar/hooks/use-calendar-details";
import { useCalendarDnD } from "@/widgets/calendar/hooks/use-calendar-dnd";
import { useCalendarOpenConversation } from "@/widgets/calendar/hooks/use-calendar-open-conversation";
import { useCalendarRealtime } from "@/widgets/calendar/hooks/use-calendar-realtime";
import { useCalendarReservationActions } from "@/widgets/calendar/hooks/use-calendar-reservation-actions";
import type { UseCalendarEventHandlersProps } from "@/widgets/calendar/types";
// removed unused imports
// removed unused imports

// Removed HandleEventChangeArgs from legacy handler to avoid unused type
// Removed legacy CancelReservationArgs type alias

// window property helpers moved to @shared/libs/dom/window-props

// interfaces moved to @/widgets/calendar/types

export function useCalendarEventHandlers({
	events,
	conversations: _conversations,
	isLocalized,
	currentView,
	isVacationDate,
	openConversation,
	addEvent,
	updateEvent,
	removeEvent,
	dataTableEditor,
	calendarRef,
}: UseCalendarEventHandlersProps) {
	const _isLocalized = isLocalized ?? false;

	// Use extracted hooks for realtime and DnD handling
	useCalendarRealtime({ calendarRef: calendarRef ?? undefined });

	const { handleEventChange } = useCalendarDnD({
		calendarRef: calendarRef ?? undefined,
		events,
		isVacationDate,
		currentView,
		updateEvent,
		isLocalized: _isLocalized,
	});

	// Open conversation via extracted hook
	const { handleOpenConversation } = useCalendarOpenConversation({
		calendarRef: calendarRef ?? undefined,
		openConversation,
	});

	// Cancel reservation via extracted hook
	const { handleCancelReservation } = useCalendarReservationActions({
		calendarRef: calendarRef ?? undefined,
		events,
		removeEvent,
		isLocalized: _isLocalized,
	});

	const { handleViewDetails } = useCalendarDetails({
		events,
		dataTableEditor,
	});

	const { handleEventAdded, handleEventModified, handleEventCancelled } =
		useCalendarDataTableAdapter({
			addEvent,
			updateEvent,
			removeEvent,
		});

	return {
		handleEventChange,
		handleOpenConversation,
		handleCancelReservation,
		handleViewDetails,
		handleEventAdded,
		handleEventModified,
		handleEventCancelled,
	};
}
