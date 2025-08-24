import { useCallback, useMemo, useRef } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { useSidebar } from "@/components/ui/sidebar";
import { createCallbackHandlers } from "@/lib/calendar-callback-factory";
// Services and utilities
import { createCalendarCallbacks } from "@/lib/calendar-callbacks";
import { getTimezone } from "@/lib/calendar-config";
import { processEventsForFreeRoam } from "@/lib/calendar-event-processor";
import {
	calculateCalendarHeight,
	useCalendarResize,
} from "@/lib/calendar-view-utils";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { useChatSidebar } from "@/lib/use-chat-sidebar";
import { useVacation } from "@/lib/vacation-context";
import { useCalendarContextMenu } from "./useCalendarContextMenu";
import { useCalendarDataTableEditor } from "./useCalendarDataTableEditor";
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
}

export function useCalendarCore({
	freeRoam,
	initialView,
	initialDate,
}: UseCalendarCoreProps) {
	const { isRTL } = useLanguage();
	const {
		handleDateClick: handleVacationDateClick,
		recordingState,
		setOnVacationUpdated,
		vacationPeriods,
	} = useVacation();
	const { state: sidebarState, open: sidebarOpen } = useSidebar();
	const { openConversation } = useSidebarChatStore();
	const { conversations, reservations, fetchConversations } = useChatSidebar();

	// Ref for calendar component
	const calendarRef = useRef<CalendarCoreRef>(null);

	// Calendar state management
	const calendarState = useCalendarState({
		freeRoam,
		initialView,
		initialDate,
	});

	// Calendar events management
	const eventsState = useCalendarEvents({
		freeRoam,
		isRTL,
		autoRefresh: false,
	});

	// Process events to mark past reservations as non-editable in free roam mode
	const processedEvents = useMemo(
		() => processEventsForFreeRoam(eventsState.events, freeRoam),
		[eventsState.events, freeRoam],
	);

	// View/height calculation
	const { calculateHeight } = useCalendarResize(
		calendarState.currentView,
		() => {
			setCalendarHeight(calculateCalendarHeight(calendarState.currentView));
		},
	);

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
		setOnVacationUpdated: setOnVacationUpdated,
		calendarRef,
	});

	// Vacation date checker (expects YYYY-MM-DD string)
	const vacationDateChecker = useVacationDateChecker(vacationPeriods);
	const isVacationDateString = useCallback((date: string) => {
		// Ensure date-only string
		const dateOnly = date.includes("T") ? date.split("T")[0] : date;
		return vacationDateChecker(dateOnly);
	}, [vacationDateChecker]);

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
		isRTL,
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
		isChangingHours: calendarState.isChangingHours,
		setIsChangingHours: calendarState.setIsChangingHours,
		isRTL,
		currentView: calendarState.currentView,
		isVacationDate: isVacationDateString,
		openEditor: dataTableEditor.openEditor,
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
				recordingState.periodIndex !== null && recordingState.field !== null
					? handleVacationDateClick
					: undefined,
				calendarState.setCurrentDate,
				calendarState.updateSlotTimes,
				calendarState.currentView,
			),
		[
			callbackHandlers,
			freeRoam,
			calendarState.currentDate,
			recordingState.periodIndex,
			recordingState.field,
			handleVacationDateClick,
			calendarState.setCurrentDate,
			calendarState.updateSlotTimes,
			calendarState.currentView,
		],
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
		isRTL,
	};
}
