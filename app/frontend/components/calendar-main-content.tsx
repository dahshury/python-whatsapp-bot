import type React from "react";
import { calculateCalendarHeight } from "@/lib/calendar-view-utils";
import type { CalendarEvent } from "@/types/calendar";
import { CalendarCore, type CalendarCoreRef } from "./calendar-core";
import { CalendarEventContextMenu } from "./calendar-event-context-menu";
import { CalendarHoverCardPortal } from "./calendar-hover-card-portal";

interface CalendarMainContentProps {
	calendarRef: React.RefObject<CalendarCoreRef>;
	processedEvents: CalendarEvent[];
	currentView: string;
	currentDate: Date;
	isRTL: boolean;
	freeRoam: boolean;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	calendarHeight: number | "auto";
	isVacationDate: (date: string) => boolean;
	callbacks: any;
	contextMenu: {
		contextMenuEvent: CalendarEvent | null;
		contextMenuPosition: { x: number; y: number } | null;
		handleContextMenu: (
			event: CalendarEvent,
			position: { x: number; y: number },
		) => void;
		handleCloseContextMenu: () => void;
	};
	hoverCard: {
		hoveredEventId: string | null;
		hoverCardPosition: any;
		isHoverCardMounted: boolean;
		isHoverCardClosing: boolean;
		onHoverCardMouseEnter: () => void;
		onHoverCardMouseLeave: () => void;
		handleEventMouseEnter: (info: any) => void;
		handleEventMouseLeave: (info: any) => void;
		closeHoverCardImmediately: () => void;
	};
	dragHandlers: {
		isDragging: boolean;
		handleEventDragStart: (info: any) => void;
		handleEventDragStop: () => void;
	};
	conversations: any;
	reservations: any;
	events: CalendarEvent[];
	dataTableEditor: any;
	handleOpenConversation: (eventId: string) => void;
	handleEventChange: (info: any) => void;
	handleCancelReservation: (eventId: string) => void;
	handleViewDetails: (eventId: string) => void;
	setCurrentView: (view: string) => void;
	setCalendarHeight: (height: number | "auto") => void;
	handleUpdateSize: () => void;
	onViewChange?: (view: string) => void;
	isHydrated: boolean;
	setCurrentDate: (date: Date) => void;
}

export function CalendarMainContent({
	calendarRef,
	processedEvents,
	currentView,
	currentDate,
	isRTL,
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
	setCurrentView,
	setCalendarHeight,
	handleUpdateSize,
	onViewChange,
	isHydrated,
	setCurrentDate,
}: CalendarMainContentProps) {
	return (
		<>
			<CalendarCore
				ref={calendarRef}
				events={processedEvents}
				currentView={currentView}
				currentDate={currentDate}
				isRTL={isRTL}
				freeRoam={freeRoam}
				slotTimes={slotTimes}
				slotTimesKey={slotTimesKey}
				calendarHeight={calendarHeight}
				isVacationDate={isVacationDate}
				onDateClick={callbacks.dateClick}
				onSelect={callbacks.select}
				onEventClick={(info) => {
					const waId =
						(info as any)?.event?.extendedProps?.wa_id ||
						(info as any)?.event?.extendedProps?.waId ||
						info.event.id;
					handleOpenConversation(waId);
					if (callbacks.eventClick) {
						callbacks.eventClick(info);
					}
				}}
				onEventChange={handleEventChange}
				onViewChange={onViewChange}
				onContextMenu={contextMenu.handleContextMenu}
				onViewDidMount={(info) => {
					if (isHydrated) {
						const newHeight = calculateCalendarHeight(info.view.type);
						setCalendarHeight(newHeight);
						setCurrentView(info.view.type);

						if (onViewChange) {
							onViewChange(info.view.type);
						}

						if (info.view.type === "multiMonthYear") {
							requestAnimationFrame(() => {
								calendarRef.current?.updateSize();
							});
						}
					}
				}}
				onDatesSet={(info) => {
					if (isHydrated) {
						setCurrentView(info.view.type);
						if (onViewChange) {
							onViewChange(info.view.type);
						}
					}
				}}
				onUpdateSize={handleUpdateSize}
				onEventMouseEnter={hoverCard.handleEventMouseEnter}
				onEventMouseLeave={hoverCard.handleEventMouseLeave}
				onEventDragStart={dragHandlers.handleEventDragStart}
				onEventDragStop={dragHandlers.handleEventDragStop}
				onEventMouseDown={hoverCard.closeHoverCardImmediately}
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
			/>

			{/* Hover Card for Events */}
			{hoverCard.hoveredEventId &&
				hoverCard.hoverCardPosition &&
				!dragHandlers.isDragging && (
					<CalendarHoverCardPortal
						hoveredEventId={hoverCard.hoveredEventId}
						hoverCardPosition={hoverCard.hoverCardPosition}
						isHoverCardMounted={hoverCard.isHoverCardMounted}
						isHoverCardClosing={hoverCard.isHoverCardClosing}
						isDragging={dragHandlers.isDragging}
						conversations={conversations}
						reservations={reservations}
						isRTL={isRTL}
						onMouseEnter={hoverCard.onHoverCardMouseEnter}
						onMouseLeave={hoverCard.onHoverCardMouseLeave}
					/>
				)}
		</>
	);
}
