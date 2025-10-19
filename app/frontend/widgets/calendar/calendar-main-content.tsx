import type { EventApi, EventChangeArg } from "@fullcalendar/core";
import type { CalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { calculateCalendarHeight } from "@shared/libs/calendar/calendar-view-utils";
import { useReservationsData } from "@shared/libs/data/websocket-data-provider";
import type React from "react";
import { useRef } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { CalendarEvent, Reservation } from "@/entities/event";
import { CalendarCore, type CalendarCoreRef } from "./calendar-core";
import { CalendarEventContextMenu } from "./calendar-event-context-menu";
import { CalendarHoverCardPortal } from "./calendar-hover-card-portal";

type CalendarMainContentProps = {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	processedEvents: CalendarEvent[];
	currentView: string;
	currentDate: Date;
	isLocalized?: boolean;
	freeRoam: boolean;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	calendarHeight: number | "auto";
	isVacationDate: (date: string) => boolean;
	callbacks: CalendarCallbacks;
	contextMenu: {
		contextMenuEvent: CalendarEvent | null;
		contextMenuPosition: { x: number; y: number } | null;
		handleContextMenu: (
			event: CalendarEvent,
			position: { x: number; y: number }
		) => void;
		handleCloseContextMenu: () => void;
	};
	hoverCard: {
		hoveredEventId: string | null;
		hoverCardPosition: {
			x: number;
			y: number;
			preferBottom?: boolean;
			eventHeight?: number;
		} | null;
		isHoverCardMounted: boolean;
		isHoverCardClosing: boolean;
		onHoverCardMouseEnter: () => void;
		onHoverCardMouseLeave: () => void;
		handleEventMouseEnter: (info: {
			event?: unknown;
			el: HTMLElement;
			jsEvent?: MouseEvent;
		}) => void;
		handleEventMouseLeave: (info: {
			event?: unknown;
			el?: HTMLElement;
			jsEvent?: MouseEvent;
		}) => void;
		closeHoverCardImmediately: () => void;
	};
	dragHandlers: {
		isDragging: boolean;
		handleEventDragStart: (info: unknown) => void;
		handleEventDragStop: () => void;
	};
	conversations: Record<string, ConversationMessage[]>;
	reservations: Record<string, Reservation[]>;
	events: CalendarEvent[];
	dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void };
	handleOpenConversation: (eventId: string) => void;
	handleEventChange: (info: EventChangeArg) => void;
	handleCancelReservation: (eventId: string) => void;
	handleViewDetails: (eventId: string) => void;
	handleOpenDocument: (waId: string) => void;
	setCurrentView: (view: string) => void;
	setCalendarHeight: (height: number | "auto") => void;
	handleUpdateSize: () => void;
	onViewChange?: (view: string) => void;
	isHydrated: boolean;
	setCurrentDate: (date: Date) => void;
	// Drawer-specific behavior toggles
	disableHoverCards?: boolean;
	disableNavLinks?: boolean;
	// Optional DnD bridging for cross-calendar drops
	droppable?: boolean;
	onEventReceive?: (info: { event: EventApi; draggedEl: HTMLElement }) => void;
};

export function CalendarMainContent({
	calendarRef,
	processedEvents,
	currentView,
	currentDate,
	isLocalized,
	freeRoam,
	slotTimes,
	slotTimesKey,
	calendarHeight,
	isVacationDate,
	callbacks,
	contextMenu,
	hoverCard,
	dragHandlers,
	conversations,
	reservations,
	events,
	dataTableEditor,
	handleOpenConversation,
	handleEventChange,
	handleCancelReservation,
	handleViewDetails,
	handleOpenDocument,
	setCurrentView,
	setCalendarHeight,
	handleUpdateSize,
	onViewChange,
	isHydrated,
	setCurrentDate,
	disableHoverCards,
	disableNavLinks,
	droppable,
	onEventReceive,
}: CalendarMainContentProps) {
	const { refresh: refreshRange } = useReservationsData();
	const SECONDS_PER_MINUTE = 60;
	const MINUTES_PER_HOUR = 60;
	const HOURS_PER_DAY = 24;
	const MS_PER_SECOND = 1000;
	const MS_PER_DAY =
		HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
	const SUBTRACT_ONE_DAY = MS_PER_DAY;
	const _isLocalized = isLocalized ?? false;
	const lastRangeKeyRef = useRef<string>("");
	const isRangeLoadingRef = useRef<boolean>(false);

	const triggerRangeRefresh = (
		fromDate: string,
		toDate: string,
		includeConversations: boolean
	) => {
		if (isRangeLoadingRef.current) {
			return;
		}
		isRangeLoadingRef.current = true;
		refreshRange({
			fromDate,
			toDate,
			...(includeConversations ? { includeConversations: true } : {}),
		})
			.catch(() => {
				// Range refresh failure is non-fatal; realtime may still populate data
			})
			.finally(() => {
				isRangeLoadingRef.current = false;
			});
	};
	return (
		<>
			<CalendarCore
				calendarHeight={calendarHeight}
				currentDate={currentDate}
				currentView={currentView}
				events={processedEvents}
				freeRoam={freeRoam}
				isLocalized={_isLocalized}
				isVacationDate={isVacationDate}
				ref={calendarRef ?? undefined}
				slotTimes={slotTimes}
				slotTimesKey={slotTimesKey}
				{...(droppable ? { droppable: Boolean(droppable) } : {})}
				{...(disableNavLinks ? { navLinks: false } : {})}
				{...(callbacks.dateClick
					? {
							onDateClick: (info: {
								date: Date;
								dateStr: string;
								allDay: boolean;
							}) =>
								callbacks.dateClick?.({
									...info,
									view: { type: currentView },
								}),
						}
					: {})}
				{...(callbacks.select
					? {
							onSelect: (info: {
								start: Date;
								end: Date;
								startStr: string;
								endStr: string;
								allDay: boolean;
							}) =>
								callbacks.select?.({
									...info,
									view: { type: currentView },
								}),
						}
					: {})}
				onEventChange={(info: EventChangeArg) => {
					try {
						handleEventChange(info);
					} catch {
						// Error handling
					}
				}}
				onEventClick={(info) => {
					const waId =
						(
							info as {
								event?: { extendedProps?: { wa_id?: string; waId?: string } };
							}
						)?.event?.extendedProps?.wa_id ||
						(
							info as {
								event?: { extendedProps?: { wa_id?: string; waId?: string } };
							}
						)?.event?.extendedProps?.waId ||
						info.event?.id;
					handleOpenConversation(waId);
					if (callbacks.eventClick) {
						callbacks.eventClick(info);
					}
				}}
				onViewChange={(viewType: string) => {
					try {
						lastRangeKeyRef.current = "";
					} catch {
						// ignore
					}
					if (onViewChange) {
						onViewChange(viewType);
					}
				}}
				{...(contextMenu?.handleContextMenu
					? { onContextMenu: contextMenu.handleContextMenu }
					: {})}
				onDatesSet={(info) => {
					// When navigating, request async data for the visible date range
					try {
						const start = info.view?.currentStart as Date | undefined;
						const end = info.view?.currentEnd as Date | undefined;
						if (start && end) {
							const toIsoDate = (d: Date) => {
								const yyyy = d.getFullYear();
								const mm = String(d.getMonth() + 1).padStart(2, "0");
								const dd = String(d.getDate()).padStart(2, "0");
								return `${yyyy}-${mm}-${dd}`;
							};
							const fromDate = toIsoDate(start);
							// currentEnd is exclusive in FullCalendar; subtract one day for inclusive
							const inclusiveEnd = new Date(end.getTime() - SUBTRACT_ONE_DAY);
							const toDate = toIsoDate(inclusiveEnd);
							const nextKey = `${fromDate}|${toDate}|${freeRoam ? 1 : 0}`;
							if (lastRangeKeyRef.current === nextKey) {
								// Skip redundant refresh for the same visible range
							} else {
								lastRangeKeyRef.current = nextKey;
								// Include conversations only in free-roam; otherwise exclude
								triggerRangeRefresh(fromDate, toDate, freeRoam);
							}
						}
					} catch {
						// Ignore range computation errors
					}
					if (isHydrated && info.view.type !== currentView) {
						setCurrentView(info.view.type);
						if (onViewChange) {
							onViewChange(info.view.type);
						}
					}
				}}
				onUpdateSize={handleUpdateSize}
				onViewDidMount={(info) => {
					if (isHydrated) {
						const newHeight = calculateCalendarHeight(info.view.type);
						setCalendarHeight(newHeight);
						if (info.view.type !== currentView) {
							setCurrentView(info.view.type);
						}

						if (onViewChange && info.view.type !== currentView) {
							onViewChange(info.view.type);
						}

						if (info.view.type === "multiMonthYear") {
							requestAnimationFrame(() => {
								calendarRef?.current?.updateSize();
							});
						}
					}
				}}
				{...(disableHoverCards
					? {}
					: {
							onEventMouseEnter: (arg: {
								event?: unknown;
								el?: HTMLElement;
								jsEvent?: MouseEvent;
							}) =>
								hoverCard.handleEventMouseEnter?.({
									event: arg?.event,
									el: arg?.el as HTMLElement,
									jsEvent: arg?.jsEvent as MouseEvent,
								}),
						})}
				{...(disableHoverCards
					? {}
					: {
							onEventMouseLeave: (arg: {
								event?: unknown;
								el?: HTMLElement;
								jsEvent?: MouseEvent;
							}) =>
								hoverCard.handleEventMouseLeave?.({
									event: arg?.event,
									el: arg?.el as HTMLElement,
									jsEvent: arg?.jsEvent as MouseEvent,
								}),
						})}
				{...(dragHandlers?.handleEventDragStart
					? { onEventDragStart: dragHandlers.handleEventDragStart }
					: {})}
				{...(dragHandlers?.handleEventDragStop
					? { onEventDragStop: dragHandlers.handleEventDragStop }
					: {})}
				{...(disableHoverCards
					? {}
					: { onEventMouseDown: hoverCard.closeHoverCardImmediately })}
				onNavDate={setCurrentDate}
				{...(onEventReceive ? { onEventReceive } : {})}
			/>

			{/* Context Menu for Events */}
			<CalendarEventContextMenu
				event={contextMenu.contextMenuEvent}
				onCancelReservation={handleCancelReservation}
				onClose={contextMenu.handleCloseContextMenu}
				onEditReservation={(eventId) => {
					const event = events.find((e) => e.id === eventId);
					if (event) {
						dataTableEditor.handleEditReservation(event);
					}
				}}
				onOpenConversation={handleOpenConversation}
				onOpenDocument={handleOpenDocument}
				onViewDetails={handleViewDetails}
				position={contextMenu.contextMenuPosition}
			/>

			{/* Hover Card for Events */}
			{!disableHoverCards &&
				hoverCard.hoveredEventId &&
				hoverCard.hoverCardPosition &&
				!dragHandlers.isDragging && (
					<CalendarHoverCardPortal
						conversations={conversations}
						hoverCardPosition={hoverCard.hoverCardPosition}
						hoveredEventId={hoverCard.hoveredEventId}
						isDragging={dragHandlers.isDragging}
						isHoverCardClosing={hoverCard.isHoverCardClosing}
						isHoverCardMounted={hoverCard.isHoverCardMounted}
						isLocalized={_isLocalized}
						onMouseEnter={hoverCard.onHoverCardMouseEnter}
						onMouseLeave={hoverCard.onHoverCardMouseLeave}
						reservations={reservations}
					/>
				)}
		</>
	);
}
