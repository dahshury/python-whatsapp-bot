/**
 * Dual Calendar Component
 *
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

'use client'

// FullCalendar types not directly used in this component
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Calendar types handled via hooks

// FullCalendarApi type now imported from shared feature types

// Services and utilities
import {
	type CalendarCallbackHandlers,
	createCalendarCallbacks,
	type VacationDateChecker,
} from '@shared/libs/calendar/calendar-callbacks'
import { getTimezone } from '@shared/libs/calendar/calendar-config'
import { useCalendarHeight } from '@shared/libs/calendar/useCalendarHeight'
import { useLanguage } from '@shared/libs/state/language-context'
import { useVacation } from '@shared/libs/state/vacation-context'
import type { CalendarEvent } from '@/entities/event'
import type { CalendarCoreRef } from '@/features/calendar'
// Custom hooks
import { useCalendarEvents, useCalendarState } from '@/features/calendar'
import { processEventsForCalendar } from '@/features/calendar/lib/process-events'
import { createVacationDateChecker } from '@/features/calendar/lib/vacation-date-checker'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { useSidebar } from '@/shared/ui/sidebar'
import { CalendarErrorFallback } from '.'
// Components
import { CalendarCore } from './CalendarCore'
import { CalendarDock } from './CalendarDock'
import { CalendarSkeleton } from './CalendarSkeleton'
import { useCalendarPane } from './dual/useCalendarPane'

type DualCalendarComponentProps = {
	freeRoam?: boolean
	initialView?: string
	initialDate?: string
	initialLeftView?: string
	initialRightView?: string
	onViewChange?: (view: string) => void
	onLeftViewChange?: (view: string) => void
	onRightViewChange?: (view: string) => void
	// Add events props to avoid duplicate API calls
	events?: CalendarEvent[]
	loading?: boolean
	onRefreshData?: () => Promise<void>
}

export const DualCalendarComponent = ({
	freeRoam = false,
	initialView: _initialView = 'timeGridWeek',
	initialDate,
	initialLeftView,
	initialRightView,
	onViewChange: _onViewChange,
	onLeftViewChange,
	onRightViewChange,
	events: externalEvents,
	loading: externalLoading,
	onRefreshData: externalRefreshData,
	ref,
}: DualCalendarComponentProps & {
	ref?: React.Ref<{
		leftCalendarRef: React.RefObject<CalendarCoreRef | null>
		rightCalendarRef: React.RefObject<CalendarCoreRef | null>
		leftView: string
		rightView: string
	} | null>
}) => {
	const { isLocalized } = useLanguage()
	const {
		handleDateClick: handleVacationDateClick,
		recordingState,
		vacationPeriods,
	} = useVacation()
	const { state: _sidebarState, open: _sidebarOpen } = useSidebar()

	// Refs for both calendars
	const leftCalendarRef = useRef<CalendarCoreRef>(null)
	const rightCalendarRef = useRef<CalendarCoreRef>(null)

	// Calendar state management for both calendars
	// For dual calendars, we use the specific initial views passed in
	// and don't rely on the shared localStorage 'calendar-view' key
	const resolvedInitialDate = (initialDate ??
		new Date().toISOString().split('T')[0]) as string

	const leftCalendarState = useCalendarState({
		freeRoam,
		initialView: initialLeftView ?? 'timeGridWeek',
		...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		// Use specific key so dual left persists independently of other calendars
		viewStorageKey: 'dual-left-calendar-view',
		dateStorageKey: 'dual-left-calendar-date',
	})

	const rightCalendarState = useCalendarState({
		freeRoam,
		initialView: initialRightView ?? 'timeGridWeek',
		...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		// Use specific key so dual right persists independently of other calendars
		viewStorageKey: 'dual-right-calendar-view',
		dateStorageKey: 'dual-right-calendar-date',
	})

	// Expose refs to parent - must be after state declaration but before any conditional returns
	React.useImperativeHandle(
		ref,
		() => ({
			leftCalendarRef,
			rightCalendarRef,
			leftView: leftCalendarState.currentView,
			rightView: rightCalendarState.currentView,
		}),
		[leftCalendarState.currentView, rightCalendarState.currentView]
	)

	// Calendar events management - fix conditional hook usage
	const localEventsState = useCalendarEvents({
		freeRoam,
		isLocalized,
		currentView: leftCalendarState.currentView, // Use left calendar view for events
		currentDate: leftCalendarState.currentDate, // Use left calendar date for events
		autoRefresh: false,
	})

	// Prefer external props when provided, otherwise use local state
	const allEvents = externalEvents ?? localEventsState.events
	const loading = externalLoading ?? localEventsState.loading
	const refreshData = externalRefreshData ?? localEventsState.refreshData

	// Filter + process events for free roam using shared helper
	const processedAllEvents = useMemo(
		() => processEventsForCalendar(allEvents, freeRoam),
		[allEvents, freeRoam]
	)

	// Use processed events for both calendars
	const processedLeftEvents = processedAllEvents
	const processedRightEvents = processedAllEvents

	// Vacation period checker (for drag/drop validation only, styling handled by background events)
	const isVacationDate: VacationDateChecker = useMemo(
		() => createVacationDateChecker(vacationPeriods),
		[vacationPeriods]
	)

	// Calculate calendar height using shared hook for each calendar
	const { height: leftCalendarHeight, recalc: recalcLeftHeight } =
		useCalendarHeight(leftCalendarState.currentView)
	const { height: rightCalendarHeight, recalc: recalcRightHeight } =
		useCalendarHeight(rightCalendarState.currentView)

	// Update calendar size when sidebar state changes
	useEffect(() => {
		const SIDEBAR_RESIZE_DEBOUNCE_MS = 50
		// Small delay to allow CSS transition to start
		const timer = setTimeout(() => {
			recalcLeftHeight()
			recalcRightHeight()
			// Update both calendars
			leftCalendarRef.current?.updateSize()
			rightCalendarRef.current?.updateSize()
		}, SIDEBAR_RESIZE_DEBOUNCE_MS)

		return () => clearTimeout(timer)
	}, [recalcLeftHeight, recalcRightHeight])

	// Wrapper for refreshData that shows blur animation
	const [isRefreshing, setIsRefreshing] = useState(false)
	const REFRESH_BLUR_MS = 300
	const handleRefreshWithBlur = useCallback(async () => {
		setIsRefreshing(true)
		try {
			await refreshData()
		} finally {
			// Small delay to ensure smooth transition
			setTimeout(() => setIsRefreshing(false), REFRESH_BLUR_MS)
		}
	}, [refreshData])

	// Compose per-pane logic via hook
	const leftPane = useCalendarPane({
		events: processedLeftEvents,
		isLocalized,
		currentView: leftCalendarState.currentView,
		isVacationDate,
		handleRefreshWithBlur,
		calendarRef: leftCalendarRef,
	})
	const rightPane = useCalendarPane({
		events: processedRightEvents,
		isLocalized,
		currentView: rightCalendarState.currentView,
		isVacationDate,
		handleRefreshWithBlur,
		calendarRef: rightCalendarRef,
	})

	// Calendar callback handlers for both calendars (provide required fields)
	const leftCallbackHandlers: CalendarCallbackHandlers = useMemo(
		() => ({
			isLocalized,
			currentView: leftCalendarState.currentView,
			isVacationDate,
			openEditor: (_opts: { start: string; end?: string }) => {
				/* noop */
			},
			handleOpenConversation: (_id: string) => {
				/* noop */
			},
			handleEventChange: async (_info) => {
				/* noop */
			},
		}),
		[isLocalized, leftCalendarState.currentView, isVacationDate]
	)

	const rightCallbackHandlers: CalendarCallbackHandlers = useMemo(
		() => ({
			isLocalized,
			currentView: rightCalendarState.currentView,
			isVacationDate,
			openEditor: (_opts: { start: string; end?: string }) => {
				/* noop */
			},
			handleOpenConversation: (_id: string) => {
				/* noop */
			},
			handleEventChange: async (_info) => {
				/* noop */
			},
		}),
		[isLocalized, rightCalendarState.currentView, isVacationDate]
	)

	// Wrapper functions provided by useCalendarPane

	const leftCallbacks = useMemo(
		() =>
			createCalendarCallbacks({
				handlers: leftCallbackHandlers,
				freeRoam,
				timezone: getTimezone(),
				currentDate: leftCalendarState.currentDate,
				...(recordingState.periodIndex !== null &&
					recordingState.field !== null && {
						handleVacationDateClick,
					}),
				setCurrentDate: leftCalendarState.setCurrentDate,
				currentView: leftCalendarState.currentView,
			}),
		[
			leftCallbackHandlers,
			freeRoam,
			leftCalendarState.currentDate,
			recordingState.periodIndex,
			recordingState.field,
			handleVacationDateClick,
			leftCalendarState.setCurrentDate,
			leftCalendarState.currentView,
		]
	)

	const rightCallbacks = useMemo(
		() =>
			createCalendarCallbacks({
				handlers: rightCallbackHandlers,
				freeRoam,
				timezone: getTimezone(),
				currentDate: rightCalendarState.currentDate,
				...(recordingState.periodIndex !== null &&
					recordingState.field !== null && {
						handleVacationDateClick,
					}),
				setCurrentDate: rightCalendarState.setCurrentDate,
				currentView: rightCalendarState.currentView,
			}),
		[
			rightCallbackHandlers,
			freeRoam,
			rightCalendarState.currentDate,
			recordingState.periodIndex,
			recordingState.field,
			handleVacationDateClick,
			rightCalendarState.setCurrentDate,
			rightCalendarState.currentView,
		]
	)

	// Vacation events are now automatically included in the events array

	// Show loading state
	if (
		loading ||
		!leftCalendarState.isHydrated ||
		!rightCalendarState.isHydrated
	) {
		return <CalendarSkeleton />
	}

	return (
		<ErrorBoundary fallback={CalendarErrorFallback}>
			<div
				className={`flex h-full gap-4 ${isRefreshing ? 'pointer-events-none opacity-75' : ''}`}
			>
				{/* Left Calendar */}
				<div className="flex-1 overflow-hidden rounded-lg border p-2">
					{/* Simple dock above the left calendar */}
					<div className="mb-2">
						<CalendarDock
							calendarRef={leftCalendarRef}
							className="mt-0"
							currentView={leftCalendarState.currentView}
							isLocalized={isLocalized}
						/>
					</div>
					<CalendarCore
						calendarHeight={leftCalendarHeight}
						currentDate={leftCalendarState.currentDate}
						currentView={leftCalendarState.currentView}
						droppable={true}
						events={processedLeftEvents}
						freeRoam={freeRoam}
						isLocalized={isLocalized}
						isVacationDate={isVacationDate}
						onDateClick={leftPane.wrapDateClick(leftCallbacks.dateClick)}
						onDatesSet={(info) => {
							if (leftCalendarState.isHydrated) {
								leftCalendarState.setCurrentView(info.view.type)
								onLeftViewChange?.(info.view.type)
							}
						}}
						onEventChange={leftPane.handleEventChange}
						onEventClick={leftCallbacks.eventClick}
						onEventReceive={leftPane.handleEventChange}
						onNavDate={leftCalendarState.setCurrentDate}
						onSelect={leftPane.wrapSelect(leftCallbacks.select)}
						onUpdateSize={leftPane.handleUpdateSize}
						onViewChange={
							onLeftViewChange ??
							(() => {
								/* noop */
							})
						}
						onViewDidMount={(info) => {
							if (leftCalendarState.isHydrated) {
								recalcLeftHeight()
								leftCalendarState.setCurrentView(info.view.type)
								onLeftViewChange?.(info.view.type)
							}
						}}
						ref={leftCalendarRef}
						slotTimes={leftCalendarState.slotTimes}
						slotTimesKey={leftCalendarState.slotTimesKey}
					/>
				</div>

				{/* Right Calendar */}
				<div className="flex-1 overflow-hidden rounded-lg border p-2">
					{/* Simple dock above the right calendar */}
					<div className="mb-2">
						<CalendarDock
							calendarRef={rightCalendarRef}
							className="mt-0"
							currentView={rightCalendarState.currentView}
							isLocalized={isLocalized}
						/>
					</div>
					<CalendarCore
						calendarHeight={rightCalendarHeight}
						currentDate={rightCalendarState.currentDate}
						currentView={rightCalendarState.currentView}
						droppable={true}
						events={processedRightEvents}
						freeRoam={freeRoam}
						isLocalized={isLocalized}
						isVacationDate={isVacationDate}
						onDateClick={rightPane.wrapDateClick(rightCallbacks.dateClick)}
						onDatesSet={(info) => {
							if (rightCalendarState.isHydrated) {
								rightCalendarState.setCurrentView(info.view.type)
								onRightViewChange?.(info.view.type)
							}
						}}
						onEventChange={rightPane.handleEventChange}
						onEventClick={rightCallbacks.eventClick}
						onEventReceive={rightPane.handleEventChange}
						onNavDate={rightCalendarState.setCurrentDate}
						onSelect={rightPane.wrapSelect(rightCallbacks.select)}
						onUpdateSize={rightPane.handleUpdateSize}
						onViewChange={
							onRightViewChange ??
							(() => {
								/* noop */
							})
						}
						onViewDidMount={(info) => {
							if (rightCalendarState.isHydrated) {
								recalcRightHeight()
								rightCalendarState.setCurrentView(info.view.type)
								onRightViewChange?.(info.view.type)
							}
						}}
						ref={rightCalendarRef}
						slotTimes={rightCalendarState.slotTimes}
						slotTimesKey={rightCalendarState.slotTimesKey}
					/>
				</div>
			</div>
		</ErrorBoundary>
	)
}

DualCalendarComponent.displayName = 'DualCalendarComponent'
