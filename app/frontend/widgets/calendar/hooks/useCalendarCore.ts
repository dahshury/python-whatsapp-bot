import { createCallbackHandlers } from "@shared/libs/calendar/calendar-callback-factory";
// Services and utilities
import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { getTimezone } from "@shared/libs/calendar/calendar-config";
import { calculateCalendarHeight, useCalendarResize } from "@shared/libs/calendar/calendar-view-utils";
import { useLanguage } from "@shared/libs/state/language-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { useCalendarDataTableEditor } from "@widgets/data-table-editor/hooks/use-calendar-data-table-editor";
import { useCallback, useMemo, useRef } from "react";
import {
	alignAndSortEventsForCalendar,
	filterEventsForCalendar,
	processEventsForFreeRoam,
} from "@/processes/calendar/calendar-events.process";
import { useChatSidebar } from "@/shared/libs/chat/use-chat-sidebar";
import { useSidebar } from "@/shared/ui/sidebar";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";
import { useCalendarContextMenu } from "./useCalendarContextMenu";
import { useCalendarDragHandlers } from "./useCalendarDragHandlers";
import { useCalendarEventHandlers } from "./useCalendarEventHandlers";
// Custom hooks
import { useCalendarEvents } from "./useCalendarEvents";
import { useCalendarHoverCard } from "./useCalendarHoverCard";
import { useCalendarInitialization } from "./useCalendarInitialization";
import { useCalendarState } from "./useCalendarState";
import { useVacationDateChecker } from "./useVacationDateChecker";

interface UseCalendarCoreProps {
	freeRoam: boolean;
	initialView: string;
	initialDate?: string;
	/** Optional prefix to separate persisted keys per context */
	storageKeyPrefix?: string;
	/** Optional explicit storage key for view */
	viewStorageKey?: string;
	/** Optional explicit storage key for date */
	dateStorageKey?: string;
	/** When true, conversations will not be fetched nor included in events */
	excludeConversations?: boolean;
}

export function useCalendarCore({
	freeRoam,
	initialView,
	initialDate,
	storageKeyPrefix,
	viewStorageKey,
	dateStorageKey,
	excludeConversations,
}: UseCalendarCoreProps) {
	const { isLocalized } = useLanguage();
	const { handleDateClick: handleVacationDateClick, recordingState, vacationPeriods } = useVacation();
	const { state: _sidebarState, open: sidebarOpen } = useSidebar();
	const { openConversation } = useSidebarChatStore();
	const { conversations, reservations, fetchConversations: _fetchConversations } = useChatSidebar();

	// Ref for calendar component
	const calendarRef = useRef<CalendarCoreRef>(null);

	// Calendar state management
	const calendarState = useCalendarState({
		freeRoam,
		initialView,
		...(initialDate && { initialDate }),
		...(storageKeyPrefix ? { storageKeyPrefix } : {}),
		...(viewStorageKey ? { viewStorageKey } : {}),
		...(dateStorageKey ? { dateStorageKey } : {}),
	});

	// Calendar events management
	const eventsState = useCalendarEvents({
		freeRoam,
		isLocalized,
		autoRefresh: false,
		...(excludeConversations ? { excludeConversations: true } : {}),
	});

	// Filter cancelled, align and sort within slots, then adjust free roam editability
	const processedEvents = useMemo(() => {
		const filtered = filterEventsForCalendar(eventsState.events, freeRoam);
		const aligned = alignAndSortEventsForCalendar(filtered, freeRoam);
		return processEventsForFreeRoam(aligned, freeRoam);
	}, [eventsState.events, freeRoam]);

	// View/height calculation
	const { calculateHeight } = useCalendarResize(calendarState.currentView, () => {
		setCalendarHeight(calculateCalendarHeight(calendarState.currentView));
	});

	// Calendar initialization and refresh
	const {
		calendarHeight,
		isRefreshing,
		handleRefreshWithBlur,
		handleUpdateSize: updateSize,
		setCalendarHeight,
	} = useCalendarInitialization({
		calculateHeight,
		sidebarOpen,
		refreshData: eventsState.refreshData,
		calendarRef,
	});

	// Vacation date checker (expects YYYY-MM-DD string)
	const vacationDateChecker = useVacationDateChecker(vacationPeriods);
	const isVacationDateString = useCallback(
		(date: string) => {
			// Ensure date-only string
			const dateOnly = date.includes("T") ? date.split("T")[0] || date : date;
			return vacationDateChecker(dateOnly);
		},
		[vacationDateChecker]
	);

	// Context menu management
	const contextMenu = useCalendarContextMenu();

	// Data table editor management
	const dataTableEditor = useCalendarDataTableEditor();

	// Create a ref for the hover card close function
	const closeHoverCardRef = useRef<(() => void) | null>(null);

	// Drag handlers
	const dragHandlers = useCalendarDragHandlers({
		closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
	});

	// Hover card management with proper drag state
	const hoverCard = useCalendarHoverCard({
		isDragging: dragHandlers.isDragging,
	});

	// Update the ref with the actual close function
	closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;

	// Event handlers
	const eventHandlers = useCalendarEventHandlers({
		events: eventsState.events,
		conversations,
		isLocalized,
		currentView: calendarState.currentView,
		isVacationDate: vacationDateChecker,
		handleRefreshWithBlur,
		openConversation,
		addEvent: eventsState.addEvent,
		updateEvent: eventsState.updateEvent,
		removeEvent: eventsState.removeEvent,
		dataTableEditor,
		calendarRef, // Pass calendar ref for direct event manipulation
	});

	// Use hover card directly without wrapper (drag state already handled inside)
	const hoverCardWithDragging = hoverCard;

	// Calendar callback handlers
	const callbackHandlers = createCallbackHandlers({
		isLocalized,
		currentView: calendarState.currentView,
		isVacationDate: isVacationDateString,
		openEditor: (opts?: { start: string; end?: string }) => {
			if (opts?.start) {
				dataTableEditor.openEditor({
					start: opts.start,
					end: opts.end || opts.start,
				});
			}
		},
		handleOpenConversation: eventHandlers.handleOpenConversation,
		handleEventChange: eventHandlers.handleEventChange,
	});

	// Create calendar callbacks with vacation support
	const callbacks = useMemo(
		() =>
			createCalendarCallbacks(
				callbackHandlers,
				freeRoam,
				getTimezone(),
				calendarState.currentDate,
				recordingState.periodIndex !== null && recordingState.field !== null ? handleVacationDateClick : undefined,
				calendarState.setCurrentDate,
				calendarState.currentView
			),
		[
			callbackHandlers,
			freeRoam,
			calendarState.currentDate,
			recordingState.periodIndex,
			recordingState.field,
			handleVacationDateClick,
			calendarState.setCurrentDate,
			calendarState.currentView,
		]
	);

	// Handle update size with ref
	const handleUpdateSize = () => updateSize(calendarRef);

	return {
		// Refs
		calendarRef,

		// State
		calendarState,
		eventsState,
		processedEvents,
		calendarHeight,
		isRefreshing,
		isVacationDate: vacationDateChecker,

		// UI State
		contextMenu,
		dataTableEditor,
		hoverCardWithDragging,
		dragHandlers,

		// Handlers
		eventHandlers,
		callbacks,
		handleUpdateSize,
		handleRefreshWithBlur,
		setCalendarHeight,

		// External data
		conversations,
		reservations,
		isLocalized,
	};
}
