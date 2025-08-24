import { useCallback } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { convertDataTableEventToCalendarEvent } from "@/lib/calendar-event-converters";
import {
	handleCancelReservation as handleCancelReservationService,
	handleEventChange as handleEventChangeService,
	handleOpenConversation as handleOpenConversationService,
} from "@/lib/calendar-event-handlers";
import type { CalendarEvent } from "@/types/calendar";
import { useEffect } from "react";

interface UseCalendarEventHandlersProps {
	events: CalendarEvent[];
	conversations: any;
	isRTL: boolean;
	currentView: string;
	isVacationDate: (date: string) => boolean;
	handleRefreshWithBlur: () => Promise<void>;
	openConversation: (id: string) => void;
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, event: CalendarEvent) => void;
	removeEvent: (id: string) => void;
	dataTableEditor: any;
	calendarRef?: React.RefObject<CalendarCoreRef>; // Optional calendar ref for API access
}

export function useCalendarEventHandlers({
	events,
	conversations,
	isRTL,
	currentView,
	isVacationDate,
	handleRefreshWithBlur,
	openConversation,
	addEvent,
	updateEvent,
	removeEvent,
	dataTableEditor,
	calendarRef,
}: UseCalendarEventHandlersProps) {

  // Ensure global registry for locally-initiated moves to suppress stale WS thrash
  (globalThis as any).__calendarLocalMoves = (globalThis as any).__calendarLocalMoves || new Map<string, number>();

  // Listen to realtime CustomEvent and update FullCalendar API directly
  useEffect(() => {
    if (!calendarRef?.current) return;
    const api = calendarRef.current.getApi?.();
    if (!api) return;

    const handler = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const { type, data } = detail;
      try {
        if (!type || !data) return;
        if (type === "reservation_created") {
          // Add if not exists by reservation id
          const existing = api.getEventById(String(data.id));
          if (!existing) {
            const start = `${data.date}T${(data.time_slot || "00:00").slice(0,5)}:00`;
            api.addEvent({
              id: String(data.id),
              title: data.customer_name || data.wa_id,
              start,
              end: start,
              extendedProps: {
                type: Number(data.type ?? 0),
                cancelled: false,
                waId: data.wa_id || data.waId,
                wa_id: data.wa_id || data.waId,
                reservationId: String(data.id),
              },
            });
          }
        } else if (type === "reservation_updated" || type === "reservation_reinstated") {
          // Suppress thrash if we just moved this event locally
          try {
            const localMoves: Map<string, number> | undefined = (globalThis as any).__calendarLocalMoves;
            const ts = localMoves?.get(String(data.id));
            if (ts && Date.now() - ts < 1000) {
              return;
            }
          } catch {}
          const evObj = api.getEventById(String(data.id));
          const start = `${data.date}T${(data.time_slot || "00:00").slice(0,5)}:00`;
          if (evObj) {
            evObj.setProp("title", data.customer_name || data.wa_id);
            evObj.setExtendedProp("type", Number(data.type ?? 0));
            evObj.setExtendedProp("cancelled", false);
            // Preserve waId for future drags
            evObj.setExtendedProp("waId", data.wa_id || (evObj as any)?.extendedProps?.waId || (evObj as any)?.extendedProps?.wa_id);
            evObj.setExtendedProp("wa_id", data.wa_id || (evObj as any)?.extendedProps?.wa_id || (evObj as any)?.extendedProps?.waId);
            evObj.setDates(new Date(start), null);
          } else {
            api.addEvent({
              id: String(data.id),
              title: data.customer_name || data.wa_id,
              start,
              end: start,
              extendedProps: {
                type: Number(data.type ?? 0),
                cancelled: false,
                waId: data.wa_id || data.waId,
                wa_id: data.wa_id || data.waId,
                reservationId: String(data.id),
              },
            });
          }
        } else if (type === "reservation_cancelled") {
          const evObj = api.getEventById(String(data.id));
          if (evObj) {
            // Mark cancelled; let processor recolor on next render
            evObj.setExtendedProp("cancelled", true);
          }
        } else if (type === "vacation_period_updated") {
          // Vacation events are handled by useCalendarInitialization via context callback
        }
      } catch {}
    };
    window.addEventListener("realtime", handler as EventListener);
    return () => window.removeEventListener("realtime", handler as EventListener);
  }, [calendarRef]);
	// Handle event change (drag and drop)
	const handleEventChange = useCallback(
		async (info: any) => {
			// Debug calendar API access
			const getCalendarApi = calendarRef?.current
				? () => {
						console.log("Calendar ref current:", !!calendarRef.current);
						const api = calendarRef.current?.getApi();
						console.log("Calendar API obtained:", !!api);
						if (api) {
							console.log(
								"Calendar API methods available:",
								Object.keys(api).slice(0, 10),
							); // Show first 10 methods
						}
						return api;
					}
				: undefined;

			if (!getCalendarApi) {
				console.warn("No calendar ref available for event change handling");
			}

			await handleEventChangeService({
				info,
				isVacationDate,
				isRTL,
				currentView,
				onRefresh: handleRefreshWithBlur,
				getCalendarApi,
				updateEvent,
				resolveEvent: (id: string) => {
					// Prefer React state events for reliable extendedProps
					const stateEvent = events.find((e) => e.id === String(id));
					if (stateEvent) return { extendedProps: stateEvent.extendedProps || {} };
					try {
						const api = getCalendarApi?.();
						const ev = api?.getEventById(String(id));
						return ev ? { extendedProps: ev.extendedProps || {} } : undefined;
					} catch {
						return undefined;
					}
				},
			});
		},
		[
			isVacationDate,
			isRTL,
			currentView,
			handleRefreshWithBlur,
			calendarRef,
			updateEvent,
		],
	);

	// Handle open conversation
	const handleOpenConversation = useCallback(
		async (eventId: string) => {
			// Prefer opening by waId/wa_id if available on the event
			let conversationId = eventId;
			try {
				const api = calendarRef?.current?.getApi?.();
				const ev = api?.getEventById(String(eventId));
				const wa = (ev as any)?.extendedProps?.waId || (ev as any)?.extendedProps?.wa_id;
				if (wa) conversationId = String(wa);
			} catch {}

			await handleOpenConversationService({
				eventId: conversationId,
				openConversation,
			});
		},
		[openConversation, calendarRef],
	);

	// Context menu handlers
	const handleCancelReservation = useCallback(
		async (eventId: string) => {
			await handleCancelReservationService({
				eventId,
				events,
				isRTL,
				onRefresh: handleRefreshWithBlur,
			});
		},
		[events, isRTL, handleRefreshWithBlur],
	);

	const handleViewDetails = useCallback(
		(eventId: string) => {
			const event = events.find((e) => e.id === eventId);
			if (event) {
				dataTableEditor.handleEditReservation(event);
			}
		},
		[events, dataTableEditor],
	);

	// Data table editor event handlers
	const handleEventAdded = useCallback(
		(event: any) => {
			addEvent(convertDataTableEventToCalendarEvent(event));
		},
		[addEvent],
	);

	const handleEventModified = useCallback(
		(eventId: string, event: any) => {
			updateEvent(eventId, convertDataTableEventToCalendarEvent(event));
		},
		[updateEvent],
	);

	const handleEventCancelled = useCallback(
		(eventId: string) => {
			removeEvent(eventId);
		},
		[removeEvent],
	);

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
