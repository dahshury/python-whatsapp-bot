import type { EventApi } from "@fullcalendar/core";
import { useCallback } from "react";
import type { CalendarCoreRef } from "@/widgets/calendar/calendar-core";

type UseCalendarOpenConversationProps = {
	calendarRef: React.RefObject<CalendarCoreRef | null> | undefined;
	openConversation: (id: string) => void;
};

type UseCalendarOpenConversationResult = {
	handleOpenConversation: (eventId: string) => void;
};

export function useCalendarOpenConversation({
	calendarRef,
	openConversation,
}: UseCalendarOpenConversationProps): UseCalendarOpenConversationResult {
	const handleOpenConversation = useCallback(
		(eventId: string) => {
			let conversationId = eventId;
			try {
				const api = calendarRef?.current?.getApi?.();
				const ev = api?.getEventById(String(eventId));
				const wa =
					(ev as EventApi)?.extendedProps?.waId ||
					(ev as EventApi)?.extendedProps?.wa_id;
				if (wa) {
					conversationId = String(wa);
				}
			} catch {
				// Error handling
			}

			openConversation(conversationId);
		},
		[openConversation, calendarRef]
	);

	return { handleOpenConversation };
}
