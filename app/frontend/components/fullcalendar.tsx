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
			[calendarRef, calendarState.currentView],
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
					conversations={React.useMemo(() => {
						interface RawConversationMessage {
							ts?: string | number;
							role?: string;
							text?: string;
							message?: string;
						}

						const out: Record<
							string,
							import("@/types/calendar").ConversationMessage[]
						> = {};
						Object.entries(conversations || {}).forEach(([id, msgs]) => {
							out[id] = (Array.isArray(msgs) ? msgs : []).map(
								(m: RawConversationMessage) => {
									const ts = m?.ts ? new Date(m.ts) : null;
									const iso =
										ts && !Number.isNaN(ts.getTime())
											? ts.toISOString()
											: undefined;
									return {
										role: m?.role || "user",
										message: String(m?.text || m?.message || ""),
										time: iso ? iso.slice(11, 19) : "00:00:00",
										date: iso
											? iso.slice(0, 10)
											: new Date().toISOString().slice(0, 10),
									};
								},
							);
						});
						return out;
					}, [conversations])}
					reservations={React.useMemo(() => {
						interface RawReservation {
							start?: string;
							customer_name?: string;
							title?: string;
							type?: number;
						}

						const out: Record<
							string,
							import("@/types/calendar").Reservation[]
						> = {};
						Object.entries(reservations || {}).forEach(([id, items]) => {
							out[id] = (Array.isArray(items) ? items : []).map(
								(r: RawReservation) => {
									const d = r?.start ? new Date(r.start) : null;
									const date =
										d && !Number.isNaN(d.getTime())
											? d.toISOString().slice(0, 10)
											: new Date().toISOString().slice(0, 10);
									const time =
										d && !Number.isNaN(d.getTime())
											? d.toISOString().slice(11, 16)
											: "00:00";
									return {
										customer_id: id,
										date,
										time_slot: time,
										customer_name: String(r?.customer_name || r?.title || id),
										type: typeof r?.type === "number" ? r.type : 0,
									};
								},
							);
						});
						return out;
					}, [reservations])}
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
