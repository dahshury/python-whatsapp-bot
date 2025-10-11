import type { EventChangeArg } from "@fullcalendar/core";
import type { CalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { calculateCalendarHeight } from "@shared/libs/calendar/calendar-view-utils";
import type React from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { CalendarEvent, Reservation } from "@/entities/event";
import { CalendarCore, type CalendarCoreRef } from "./CalendarCore";
import { CalendarEventContextMenu } from "./CalendarEventContextMenu";
import { CalendarHoverCardPortal } from "./CalendarHoverCardPortal";

interface CalendarMainContentProps {
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
		handleContextMenu: (event: CalendarEvent, position: { x: number; y: number }) => void;
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
		handleEventMouseEnter: (info: { event?: unknown; el: HTMLElement; jsEvent?: MouseEvent }) => void;
		handleEventMouseLeave: (info: { event?: unknown; el?: HTMLElement; jsEvent?: MouseEvent }) => void;
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
}

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
}: CalendarMainContentProps) {
	const _isLocalized = isLocalized ?? false;
	return (
		<>
			<CalendarCore
				ref={calendarRef}
				events={processedEvents}
				currentView={currentView}
				currentDate={currentDate}
				isLocalized={_isLocalized}
				freeRoam={freeRoam}
				slotTimes={slotTimes}
				slotTimesKey={slotTimesKey}
				calendarHeight={calendarHeight}
				isVacationDate={isVacationDate}
				{...(disableNavLinks ? { navLinks: false } : {})}
				{...(callbacks.dateClick
					? {
							onDateClick: (info: { date: Date; dateStr: string; allDay: boolean }) =>
								callbacks.dateClick?.({
									...info,
									view: { type: currentView },
								}),
						}
					: {})}
				{...(callbacks.select
					? {
							onSelect: (info: { start: Date; end: Date; startStr: string; endStr: string; allDay: boolean }) =>
								callbacks.select?.({
									...info,
									view: { type: currentView },
								}),
						}
					: {})}
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
				onEventChange={(info: EventChangeArg) => {
					try {
						handleEventChange(info);
					} catch {}
				}}
				{...(onViewChange && { onViewChange })}
				{...(contextMenu?.handleContextMenu ? { onContextMenu: contextMenu.handleContextMenu } : {})}
				onViewDidMount={(info) => {
					if (isHydrated) {
						const newHeight = calculateCalendarHeight(info.view.type);
						setCalendarHeight(newHeight);
						if (info.view.type !== currentView) setCurrentView(info.view.type);

						if (onViewChange) {
							if (info.view.type !== currentView) onViewChange(info.view.type);
						}

						if (info.view.type === "multiMonthYear") {
							requestAnimationFrame(() => {
								calendarRef?.current?.updateSize();
							});
						}
					}
				}}
				onDatesSet={(info) => {
					if (isHydrated) {
						if (info.view.type !== currentView) {
							setCurrentView(info.view.type);
							if (onViewChange) {
								onViewChange(info.view.type);
							}
						}
					}
				}}
				onUpdateSize={handleUpdateSize}
				{...(disableHoverCards
					? {}
					: {
							onEventMouseEnter: (arg: { event?: unknown; el?: HTMLElement; jsEvent?: MouseEvent }) =>
								hoverCard.handleEventMouseEnter?.({
									event: arg?.event,
									el: arg?.el as HTMLElement,
									jsEvent: arg?.jsEvent as MouseEvent,
								}),
						})}
				{...(disableHoverCards
					? {}
					: {
							onEventMouseLeave: (arg: { event?: unknown; el?: HTMLElement; jsEvent?: MouseEvent }) =>
								hoverCard.handleEventMouseLeave?.({
									event: arg?.event,
									el: arg?.el as HTMLElement,
									jsEvent: arg?.jsEvent as MouseEvent,
								}),
						})}
				{...(dragHandlers?.handleEventDragStart ? { onEventDragStart: dragHandlers.handleEventDragStart } : {})}
				{...(dragHandlers?.handleEventDragStop ? { onEventDragStop: dragHandlers.handleEventDragStop } : {})}
				{...(disableHoverCards ? {} : { onEventMouseDown: hoverCard.closeHoverCardImmediately })}
				onNavDate={setCurrentDate}
			/>

			{/* Context Menu for Events */}
			<CalendarEventContextMenu
				event={contextMenu.contextMenuEvent}
				position={contextMenu.contextMenuPosition}
				onClose={contextMenu.handleCloseContextMenu}
				onCancelReservation={handleCancelReservation}
				onEditReservation={(eventId) => {
					const event = events.find((e) => e.id === eventId);
					if (event) {
						dataTableEditor.handleEditReservation(event);
					}
				}}
				onViewDetails={handleViewDetails}
				onOpenConversation={handleOpenConversation}
				onOpenDocument={handleOpenDocument}
			/>

			{/* Hover Card for Events */}
			{!disableHoverCards && hoverCard.hoveredEventId && hoverCard.hoverCardPosition && !dragHandlers.isDragging && (
				<CalendarHoverCardPortal
					hoveredEventId={hoverCard.hoveredEventId}
					hoverCardPosition={hoverCard.hoverCardPosition}
					isHoverCardMounted={hoverCard.isHoverCardMounted}
					isHoverCardClosing={hoverCard.isHoverCardClosing}
					isDragging={dragHandlers.isDragging}
					conversations={conversations}
					reservations={reservations}
					isLocalized={_isLocalized}
					onMouseEnter={hoverCard.onHoverCardMouseEnter}
					onMouseLeave={hoverCard.onHoverCardMouseLeave}
				/>
			)}
		</>
	);
}
