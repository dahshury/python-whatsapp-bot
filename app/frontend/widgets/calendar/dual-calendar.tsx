/**
 * Dual Calendar Component
 *
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client";

// removed DateSelectArg and DateClickInfo imports; we map callbacks inline
// Import types from calendar handlers
import type { CalendarEvent } from "@/entities/event";

// Remove local legacy type aliases; use domain types and core handlers

import React, { useCallback, useMemo } from "react";

// Remove custom FullCalendarApi typing; rely on core

import type { EventApi, EventChangeArg } from "@fullcalendar/core";
import type { VacationDateChecker } from "@shared/libs/calendar/calendar-callbacks";
import { useLanguage } from "@shared/libs/state/language-context";
// Services and utilities
import {
	CalendarErrorFallback,
	ErrorBoundary,
} from "@/shared/ui/error-boundary";
// Custom hooks
import { useCalendarCore } from "@/widgets/calendar/hooks/use-calendar-core";
import { useProcessedEvents } from "@/widgets/calendar/hooks/use-processed-events";
import { CalendarDock } from "./calendar-dock";
// Components
import { CalendarMainContent } from "./calendar-main-content";
import { CalendarSkeleton } from "./calendar-skeleton";
import type { CalendarCoreRef } from "./types";

type DualCalendarComponentProps = {
	freeRoam?: boolean;
	initialView?: string;
	initialDate?: string;
	initialLeftView?: string;
	initialRightView?: string;
	onViewChange?: (view: string) => void;
	onLeftViewChange?: (view: string) => void;
	onRightViewChange?: (view: string) => void;
	// Add events props to avoid duplicate API calls
	events?: CalendarEvent[];
	loading?: boolean;
	onRefreshData?: () => Promise<void>;
	ref?: React.Ref<{
		leftCalendarRef: React.RefObject<CalendarCoreRef>;
		rightCalendarRef: React.RefObject<CalendarCoreRef>;
		leftView: string;
		rightView: string;
	}>;
};

type CalendarPanelProps = {
	core: ReturnType<typeof useCalendarCore>;
	handleEventChange: (info: EventChangeArg) => void;
	handleEventReceive: (info: {
		event: EventApi;
		draggedEl: HTMLElement;
	}) => void;
	handleUpdateSize: () => void;
	processedEvents: CalendarEvent[];
	isLocalized: boolean;
	isVacationDate: VacationDateChecker;
	freeRoam: boolean;
	onViewChange?: ((view: string) => void) | undefined;
};

// Helper to build ref handle value
const buildRefHandleValue = (
	leftCore: ReturnType<typeof useCalendarCore>,
	rightCore: ReturnType<typeof useCalendarCore>
) => ({
	leftCalendarRef: leftCore.calendarRef,
	rightCalendarRef: rightCore.calendarRef,
	leftView: leftCore.calendarState.currentView,
	rightView: rightCore.calendarState.currentView,
});

// Sub-component for left calendar rendering
const LeftCalendarPanel = React.memo(
	({
		core,
		handleEventChange,
		handleEventReceive,
		handleUpdateSize,
		processedEvents,
		isLocalized,
		isVacationDate,
		freeRoam,
		onViewChange,
	}: CalendarPanelProps) => (
		<div className="flex-1 overflow-hidden rounded-lg border p-2">
			<div className="mb-2">
				<CalendarDock
					calendarRef={core.calendarRef}
					className="mt-0"
					currentView={core.calendarState.currentView}
					isLocalized={isLocalized}
				/>
			</div>
			<CalendarMainContent
				calendarHeight={core.calendarHeight}
				calendarRef={core.calendarRef}
				callbacks={core.callbacks}
				contextMenu={core.contextMenu}
				conversations={core.conversations}
				currentDate={core.calendarState.currentDate}
				currentView={core.calendarState.currentView}
				dataTableEditor={core.dataTableEditor}
				dragHandlers={core.dragHandlers}
				events={core.eventsState.events}
				freeRoam={freeRoam}
				handleCancelReservation={core.eventHandlers.handleCancelReservation}
				handleEventChange={handleEventChange}
				handleOpenConversation={core.eventHandlers.handleOpenConversation}
				handleOpenDocument={() => {
					// No-op: document operations not applicable in dual calendar view
				}}
				handleUpdateSize={handleUpdateSize}
				handleViewDetails={core.eventHandlers.handleViewDetails}
				hoverCard={core.hoverCardWithDragging}
				isLocalized={isLocalized}
				isVacationDate={isVacationDate}
				processedEvents={processedEvents}
				reservations={core.reservations}
				setCalendarHeight={core.setCalendarHeight}
				setCurrentView={core.calendarState.setCurrentView}
				slotTimes={core.calendarState.slotTimes}
				slotTimesKey={core.calendarState.slotTimesKey}
				{...(onViewChange ? { onViewChange } : {})}
				disableHoverCards
				disableNavLinks
				droppable
				isHydrated={core.calendarState.isHydrated}
				onEventReceive={(info) => handleEventReceive(info)}
				setCurrentDate={core.calendarState.setCurrentDate}
			/>
		</div>
	)
);

// Sub-component for right calendar rendering
const RightCalendarPanel = React.memo(
	({
		core,
		handleEventChange,
		handleEventReceive,
		handleUpdateSize,
		processedEvents,
		isLocalized,
		isVacationDate,
		freeRoam,
		onViewChange,
	}: CalendarPanelProps) => (
		<div className="flex-1 overflow-hidden rounded-lg border p-2">
			<div className="mb-2">
				<CalendarDock
					calendarRef={core.calendarRef}
					className="mt-0"
					currentView={core.calendarState.currentView}
					isLocalized={isLocalized}
				/>
			</div>
			<CalendarMainContent
				calendarHeight={core.calendarHeight}
				calendarRef={core.calendarRef}
				callbacks={core.callbacks}
				contextMenu={core.contextMenu}
				conversations={core.conversations}
				currentDate={core.calendarState.currentDate}
				currentView={core.calendarState.currentView}
				dataTableEditor={core.dataTableEditor}
				dragHandlers={core.dragHandlers}
				events={core.eventsState.events}
				freeRoam={freeRoam}
				handleCancelReservation={core.eventHandlers.handleCancelReservation}
				handleEventChange={handleEventChange}
				handleOpenConversation={core.eventHandlers.handleOpenConversation}
				handleOpenDocument={() => {
					// No-op: document operations not applicable in dual calendar view
				}}
				handleUpdateSize={handleUpdateSize}
				handleViewDetails={core.eventHandlers.handleViewDetails}
				hoverCard={core.hoverCardWithDragging}
				isLocalized={isLocalized}
				isVacationDate={isVacationDate}
				processedEvents={processedEvents}
				reservations={core.reservations}
				setCalendarHeight={core.setCalendarHeight}
				setCurrentView={core.calendarState.setCurrentView}
				slotTimes={core.calendarState.slotTimes}
				slotTimesKey={core.calendarState.slotTimesKey}
				{...(onViewChange ? { onViewChange } : {})}
				disableHoverCards
				disableNavLinks
				droppable
				isHydrated={core.calendarState.isHydrated}
				onEventReceive={(info) => handleEventReceive(info)}
				setCurrentDate={core.calendarState.setCurrentDate}
			/>
		</div>
	)
);

export function DualCalendarComponent(
	props: DualCalendarComponentProps & {
		ref?:
			| ((
					instance: {
						leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
						rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
						leftView: string;
						rightView: string;
					} | null
			  ) => void)
			| React.RefObject<{
					leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
					rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
					leftView: string;
					rightView: string;
			  } | null>;
	}
) {
	const {
		freeRoam = false,
		initialDate,
		initialLeftView,
		initialRightView,
		onLeftViewChange,
		onRightViewChange,
		events: externalEvents,
		loading: externalLoading,
		ref,
	} = props;
	const { isLocalized } = useLanguage();
	const resolvedInitialDate = (initialDate ??
		new Date().toISOString().split("T")[0]) as string;

	const leftCore = useCalendarCore({
		freeRoam,
		initialView: initialLeftView ?? "timeGridWeek",
		...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		viewStorageKey: "dual-left-calendar-view",
		dateStorageKey: "dual-left-calendar-date",
		excludeConversations: true,
	});

	const rightCore = useCalendarCore({
		freeRoam,
		initialView: initialRightView ?? "timeGridWeek",
		...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		viewStorageKey: "dual-right-calendar-view",
		dateStorageKey: "dual-right-calendar-date",
		excludeConversations: true,
	});

	React.useImperativeHandle(
		ref,
		() => buildRefHandleValue(leftCore, rightCore),
		[leftCore, rightCore]
	);

	const processedExternalEvents = useProcessedEvents(
		externalEvents ?? [],
		freeRoam
	);
	const processedLeftEvents = externalEvents
		? processedExternalEvents
		: leftCore.processedEvents;
	const processedRightEvents = externalEvents
		? processedExternalEvents
		: rightCore.processedEvents;
	const loading =
		externalLoading ??
		(leftCore.eventsState.loading || rightCore.eventsState.loading);

	const isVacationDate: VacationDateChecker = useMemo(
		() => leftCore.isVacationDate,
		[leftCore.isVacationDate]
	);

	const isRefreshing = (leftCore.isRefreshing ||
		rightCore.isRefreshing) as boolean;

	const handleLeftEventChange = useCallback(
		(info: EventChangeArg) => {
			leftCore.eventHandlers.handleEventChange(info);
		},
		[leftCore.eventHandlers.handleEventChange, leftCore.eventHandlers]
	);

	const handleRightEventChange = useCallback(
		(info: EventChangeArg) => {
			rightCore.eventHandlers.handleEventChange(info);
		},
		[rightCore.eventHandlers.handleEventChange, rightCore.eventHandlers]
	);

	const handleLeftEventReceive = handleLeftEventChange as unknown as (info: {
		event: EventApi;
		draggedEl: HTMLElement;
	}) => void;

	const handleRightEventReceive = handleRightEventChange as unknown as (info: {
		event: EventApi;
		draggedEl: HTMLElement;
	}) => void;

	const handleLeftUpdateSize = useCallback(() => {
		leftCore.handleUpdateSize();
	}, [leftCore.handleUpdateSize, leftCore]);

	const handleRightUpdateSize = useCallback(() => {
		rightCore.handleUpdateSize();
	}, [rightCore.handleUpdateSize, rightCore]);

	if (
		loading ||
		!leftCore.calendarState.isHydrated ||
		!rightCore.calendarState.isHydrated
	) {
		return <CalendarSkeleton />;
	}

	return (
		<ErrorBoundary fallback={CalendarErrorFallback}>
			<div
				className={`flex h-full gap-4 ${isRefreshing ? "pointer-events-none opacity-75" : ""}`}
			>
				{/* Left Calendar */}
				<LeftCalendarPanel
					core={leftCore}
					freeRoam={freeRoam}
					handleEventChange={handleLeftEventChange}
					handleEventReceive={handleLeftEventReceive}
					handleUpdateSize={handleLeftUpdateSize}
					isLocalized={isLocalized}
					isVacationDate={isVacationDate}
					onViewChange={onLeftViewChange}
					processedEvents={processedLeftEvents}
				/>

				{/* Right Calendar */}
				<RightCalendarPanel
					core={rightCore}
					freeRoam={freeRoam}
					handleEventChange={handleRightEventChange}
					handleEventReceive={handleRightEventReceive}
					handleUpdateSize={handleRightUpdateSize}
					isLocalized={isLocalized}
					isVacationDate={isVacationDate}
					onViewChange={onRightViewChange}
					processedEvents={processedRightEvents}
				/>
			</div>
		</ErrorBoundary>
	);
}

DualCalendarComponent.displayName = "DualCalendarComponent";
