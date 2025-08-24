/**
 * FullCalendar Component
 *
 * Main calendar component that orchestrates all services, hooks, and components.
 * Clean separation of concerns with proper dependency injection and state management.
 * Follows Domain-Driven Design principles for maintainable and scalable code.
 */

"use client";

import React from "react";
import { useCalendarCore } from "@/hooks/useCalendarCore";
import { SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import { CalendarContainer } from "./calendar-container";
// Components
import type { CalendarCoreRef } from "./calendar-core";
import { CalendarDataTableEditorWrapper } from "./calendar-data-table-editor-wrapper";
import { CalendarMainContent } from "./calendar-main-content";

interface FullCalendarComponentProps {
	freeRoam?: boolean;
	initialView?: string;
	initialDate?: string;
	onViewChange?: (view: string) => void;
}

export const FullCalendarComponent = React.forwardRef<
	{ calendarRef: React.RefObject<CalendarCoreRef>; currentView: string },
	FullCalendarComponentProps
>(
	(
		{
			freeRoam = false,
			initialView = "multiMonthYear",
			initialDate,
			onViewChange,
		},
		ref,
	) => {
		// Initialize all calendar hooks and state
		const {
			calendarRef,
			calendarState,
			eventsState,
			processedEvents,
			calendarHeight,
			isRefreshing,
			isVacationDate,
			contextMenu,
			dataTableEditor,
			hoverCardWithDragging,
			dragHandlers,
			eventHandlers,
			callbacks,
			handleUpdateSize,
			handleRefreshWithBlur,
			setCalendarHeight,
			conversations,
			reservations,
			isRTL,
		} = useCalendarCore({ freeRoam, initialView, initialDate });

		// Expose ref and current view to parent
		React.useImperativeHandle(
			ref,
			() => ({
				calendarRef,
				currentView: calendarState.currentView,
			}),
			[calendarState.currentView],
		);

		return (
			<CalendarContainer
				loading={eventsState.loading}
				isHydrated={calendarState.isHydrated}
				isRefreshing={isRefreshing}
			>
				<CalendarMainContent
					calendarRef={calendarRef}
					processedEvents={processedEvents}
					currentView={calendarState.currentView}
					currentDate={calendarState.currentDate}
					isRTL={isRTL}
					freeRoam={freeRoam}
					slotTimes={calendarState.slotTimes}
					slotTimesKey={calendarState.slotTimesKey}
					calendarHeight={calendarHeight}
					isVacationDate={isVacationDate}
					callbacks={callbacks}
					contextMenu={contextMenu}
					hoverCard={hoverCardWithDragging}
					dragHandlers={dragHandlers}
					conversations={conversations}
					reservations={reservations}
					events={eventsState.events}
					dataTableEditor={dataTableEditor}
					handleOpenConversation={eventHandlers.handleOpenConversation}
					handleEventChange={eventHandlers.handleEventChange}
					handleCancelReservation={eventHandlers.handleCancelReservation}
					handleViewDetails={eventHandlers.handleViewDetails}
					setCurrentView={calendarState.setCurrentView}
					setCalendarHeight={setCalendarHeight}
					handleUpdateSize={handleUpdateSize}
					onViewChange={onViewChange}
					isHydrated={calendarState.isHydrated}
					setCurrentDate={calendarState.setCurrentDate}
				/>

				<CalendarDataTableEditorWrapper
					editorOpen={dataTableEditor.editorOpen}
					shouldLoadEditor={dataTableEditor.shouldLoadEditor}
					selectedDateRange={dataTableEditor.selectedDateRange}
					events={eventsState.events}
					freeRoam={freeRoam}
					calendarRef={calendarRef}
					isRTL={isRTL}
					slotDurationHours={SLOT_DURATION_HOURS}
					onOpenChange={dataTableEditor.setEditorOpen}
					onEventAdded={eventHandlers.handleEventAdded}
					onEventModified={eventHandlers.handleEventModified}
					onEventCancelled={eventHandlers.handleEventCancelled}
					onSave={handleRefreshWithBlur}
					closeEditor={dataTableEditor.closeEditor}
					setShouldLoadEditor={dataTableEditor.setShouldLoadEditor}
				/>
			</CalendarContainer>
		);
	},
);

FullCalendarComponent.displayName = "FullCalendarComponent";
