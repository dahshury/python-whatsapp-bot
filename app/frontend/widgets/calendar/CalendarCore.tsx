/**
 * Calendar Core Component
 *
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

'use client'

import type { EventApi, EventContentArg } from '@fullcalendar/core'
import arLocale from '@fullcalendar/core/locales/ar-sa'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import multiMonthPlugin from '@fullcalendar/multimonth'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import {
	getBusinessHours,
	getHiddenDays,
	getTimezone,
	SLOT_DURATION_HOURS,
} from '@shared/libs/calendar/calendar-config'
import {
	CALENDAR_ASPECT_RATIO,
	CALENDAR_FIRST_DAY,
} from '@shared/libs/calendar/constants'
// removed: dev-profiler count (legacy handlers removed)
import { useMountReady } from '@shared/libs/dom/useMountReady'
import { useModifierKeyClasses } from '@shared/libs/keyboard/useModifierKeyClasses'
import React, {
	type RefObject,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { CalendarEvent } from '@/entities/event'
import {
	createDayCellClassNames,
	createDayHeaderClassNames,
	createEventAllow,
	createSelectAllow,
} from '@/entities/vacation'
import { useAppConfigQuery } from '@/features/app-config'
import { snapshotToLegacyConfig } from '@/features/app-config/model'
import type { CalendarCoreProps, CalendarCoreRef } from '@/features/calendar'
import {
	createDatesSet,
	createViewDidMount,
	eventDidMountHandler,
	getConstraintsProp,
	getGlobalValidRange,
	getViewsProp,
	optimizeEventsForView,
	eventContent as renderEventContent,
	getEventClassNames as resolveEventClassNames,
	sanitizeEvents,
	useBatchedEventChangeWithCleanup,
	useCalendarResize,
	useFrozenEventsWhileDragging,
	useSlotTimesEffect,
	useValidRangeEffect,
} from '@/features/calendar'

/**
 * Get CSS class names for container based on current view
 */
const getCalendarClassNames = (currentView: string) => {
	if (currentView?.includes('timeGrid')) {
		return 'week-view-container'
	}
	return ''
}

// UI thresholds
const SMALL_SCREEN_MAX_WIDTH = 640

/**
 * Calendar Core Component - Pure FullCalendar rendering
 */
const CalendarCoreComponent = ({
	ref,
	...props
}: CalendarCoreProps & { ref?: RefObject<CalendarCoreRef | null> }) => {
	const {
		events,
		currentView,
		currentDate,
		isLocalized,
		freeRoam,
		slotTimes,
		slotTimesKey: _slotTimesKey,
		calendarHeight,
		isVacationDate,
		onDateClick,
		onSelect,
		onEventClick,
		onEventChange,
		onViewDidMount,
		onEventDidMount,
		onDatesSet,
		onEventMouseEnter,
		onEventMouseLeave,
		onEventDragStart,
		onEventDragStop,
		onViewChange: _onViewChange,
		onContextMenu,
		onEventMouseDown,
		onNavDate,
		droppable,
		onEventReceive,
		onEventLeave,
		navLinks: navLinksEnabled = true,
	} = props

	const { data: appConfig } = useAppConfigQuery()
	const snapshot = appConfig?.toSnapshot()
	const calendarConfig = useMemo(
		() => (snapshot ? snapshotToLegacyConfig(snapshot) : null),
		[snapshot]
	)
	const timezone = useMemo(
		() => getTimezone(snapshot ? { timezone: snapshot.timezone } : undefined),
		[snapshot]
	)
	const calendarFirstDay = snapshot?.calendarFirstDay ?? CALENDAR_FIRST_DAY
	const eventLoadingConfig = snapshot?.eventLoading ?? null

	// Get locale from config or fallback to isLocalized
	const calendarLocale = useMemo(() => {
		const configLocale = snapshot?.calendarLocale
		if (configLocale) {
			// If config specifies a locale, use it (fallback to ar-sa for Arabic, en for others)
			if (configLocale.toLowerCase().startsWith('ar')) {
				return arLocale
			}
			// For other locales, use the locale code string (FullCalendar will handle it)
			return configLocale
		}
		return isLocalized ? arLocale : 'en'
	}, [snapshot, isLocalized])

	// Get direction from config or fallback
	const calendarDirection = useMemo(() => {
		const configDirection = snapshot?.calendarDirection
		if (configDirection && configDirection !== 'auto') {
			return configDirection
		}
		// Auto-detect from locale if direction is "auto"
		if (configDirection === 'auto' || !configDirection) {
			const locale = snapshot?.calendarLocale
			if (locale?.toLowerCase().startsWith('ar')) {
				return 'rtl'
			}
			return 'ltr'
		}
		return 'ltr'
	}, [snapshot])

	// Track screen size for responsive time format
	const [isSmallScreen, setIsSmallScreen] = useState(() =>
		typeof window !== 'undefined'
			? window.innerWidth < SMALL_SCREEN_MAX_WIDTH
			: false
	)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}
		const handleResize = () => {
			setIsSmallScreen(window.innerWidth < SMALL_SCREEN_MAX_WIDTH)
		}
		handleResize()
		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])

	const eventTimeFormatConfig = snapshot?.eventTimeFormat
	const eventTimeFormat = useMemo(() => {
		const showMinutes = eventTimeFormatConfig?.showMinutes ?? true
		const showMeridiemPreference = eventTimeFormatConfig?.showMeridiem

		const buildFormat = (
			hour12: boolean
		): {
			hour: 'numeric' | '2-digit'
			minute?: '2-digit'
			meridiem?: 'short'
			hour12: boolean
		} => {
			const hourValue: 'numeric' | '2-digit' = hour12 ? 'numeric' : '2-digit'
			const base = {
				hour: hourValue,
				hour12,
			}
			if (showMinutes) {
				return {
					...base,
					minute: '2-digit' as const,
					...(hour12 && (showMeridiemPreference ?? !isSmallScreen)
						? { meridiem: 'short' as const }
						: {}),
				}
			}
			return {
				...base,
				...(hour12 && (showMeridiemPreference ?? !isSmallScreen)
					? { meridiem: 'short' as const }
					: {}),
			}
		}

		if (!eventTimeFormatConfig || eventTimeFormatConfig.format === 'auto') {
			return isSmallScreen ? buildFormat(false) : buildFormat(true)
		}

		if (eventTimeFormatConfig.format === '24h') {
			if (showMinutes) {
				return {
					hour: '2-digit' as const,
					minute: '2-digit' as const,
					hour12: false,
				}
			}
			return {
				hour: '2-digit' as const,
				hour12: false,
			}
		}

		// 12-hour format
		if (showMinutes) {
			return {
				hour: 'numeric' as const,
				minute: '2-digit' as const,
				hour12: true,
				...(showMeridiemPreference ? { meridiem: 'short' as const } : {}),
			}
		}
		return {
			hour: 'numeric' as const,
			hour12: true,
			...(showMeridiemPreference ? { meridiem: 'short' as const } : {}),
		}
	}, [eventTimeFormatConfig, isSmallScreen])

	// Optimize events with feature lib
	const optimizedEvents = useMemo(
		() => optimizeEventsForView(events, currentView),
		[events, currentView]
	)

	// Delegated, simplified eventDidMount
	const handleEventDidMountCb = useCallback(
		(info: { event: EventApi; el: HTMLElement; view: { type: string } }) => {
			const viewType = info?.view?.type
			eventDidMountHandler({
				eventApi: info.event,
				el: info.el,
				viewType,
				...(onEventMouseDown ? { onEventMouseDown } : {}),
				...(viewType === 'multiMonthYear' || !onContextMenu
					? {}
					: { onContextMenu }),
				...(onEventDidMount ? { onEventDidMount } : {}),
			})
		},
		[onContextMenu, onEventDidMount, onEventMouseDown]
	)

	// Sanitize events to guard against any with missing/invalid start
	const sanitizedEvents = useMemo(
		() => sanitizeEvents(optimizedEvents as CalendarEvent[]),
		[optimizedEvents]
	)

	// Freeze external updates while dragging
	const renderEvents = useFrozenEventsWhileDragging(sanitizedEvents)

	const calendarRef = useRef<FullCalendar>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const lastNavSignatureRef = useRef<string | null>(null)
	const mountReady = useMountReady(
		() => containerRef.current?.getBoundingClientRect?.(),
		60
	)

	// Removed dynamic text resizing and fitting logic for event titles/time

	// Stable callbacks for FullCalendar props to avoid conditional hook calls
	const eventClassNamesMemo = useCallback((arg: EventContentArg) => {
		const payload: {
			event: {
				classNames?: string[]
				extendedProps?: Record<string, unknown>
			}
		} = {
			event: {},
		}
		const cls = (arg?.event as unknown as { classNames?: string[] })?.classNames
		if (cls) {
			payload.event.classNames = cls
		}
		const ext = (
			arg?.event as unknown as {
				extendedProps?: Record<string, unknown>
			}
		)?.extendedProps
		if (ext) {
			payload.event.extendedProps = ext
		}
		return resolveEventClassNames(
			payload as unknown as {
				event?: {
					classNames?: string[]
					extendedProps?: Record<string, unknown>
				}
			}
		)
	}, [])

	const eventContentMemo = useCallback(
		(arg: EventContentArg) =>
			renderEventContent(
				arg as unknown as Pick<EventContentArg, 'timeText' | 'event'>
			),
		[]
	)

	// Expose calendar API to parent component
	useImperativeHandle(
		ref,
		() => ({
			getApi: () => calendarRef.current?.getApi(),
			updateSize: () => {
				const api = calendarRef.current?.getApi?.()
				// Guard: only update when view is available (avoids transient nulls in multimonth transitions)
				if (api?.view) {
					api.updateSize?.()
				}
			},
		}),
		[]
	)

	// Memoize business hours to prevent unnecessary recalculations
	const businessHours = useMemo(
		() => getBusinessHours(freeRoam, calendarConfig ?? undefined),
		[freeRoam, calendarConfig]
	)

	// Calculate hidden days based on config
	const hiddenDays = useMemo(
		() => getHiddenDays(freeRoam, calendarConfig ?? undefined),
		[freeRoam, calendarConfig]
	)

	/**
	 * Global validRange function for FullCalendar
	 */
	const globalValidRangeFunction = useMemo(
		() => getGlobalValidRange(freeRoam, props.overrideValidRange),
		[freeRoam, props.overrideValidRange]
	)

	// Prepare validRange prop for FullCalendar
	// Disable validRange specifically for multiMonthYear to avoid plugin issues
	const validRangeProp =
		currentView === 'multiMonthYear' || !globalValidRangeFunction
			? {}
			: { validRange: globalValidRangeFunction }

	const viewsProp = useMemo(
		() => getViewsProp(eventLoadingConfig),
		[eventLoadingConfig]
	)
	const eventDisplayLimits = useMemo(
		() => ({
			dayMaxEvents: eventLoadingConfig?.dayMaxEvents ?? true,
			dayMaxEventRows: eventLoadingConfig?.dayMaxEventRows ?? true,
			moreLinkClick: eventLoadingConfig?.moreLinkClick ?? 'popover',
		}),
		[eventLoadingConfig]
	)

	// Conditionally apply constraints only for timeGrid views
	const constraintsProp = useMemo(
		() => getConstraintsProp(freeRoam, currentView),
		[freeRoam, currentView]
	)

	// Day cell/header class factories
	const getDayCellClassNames = useMemo(
		() => createDayCellClassNames(currentDate, freeRoam, isVacationDate),
		[currentDate, freeRoam, isVacationDate]
	)
	const getDayHeaderClassNames = useMemo(
		() => createDayHeaderClassNames(isVacationDate),
		[isVacationDate]
	)

	// Prevent selecting ranges that include vacation days
	const handleSelectAllow = useMemo(
		() => createSelectAllow(isVacationDate),
		[isVacationDate]
	)

	// Block dragging into or within vacation days
	const handleEventAllow = useMemo(
		() => createEventAllow(isVacationDate),
		[isVacationDate]
	)

	// Handle event mounting with context menu support
	/* legacy eventDidMount block removed */

	// Handle view mounting (legacy removed)

	// Handle dates set (legacy removed)

	// Adapter to a minimal API used by helper hooks
	const getApiAdapter = useCallback(() => {
		const api = calendarRef.current?.getApi?.()
		if (!api) {
			return
		}
		return {
			setOption: (name: string, value: unknown) =>
				(
					api as unknown as { setOption: (n: string, v: unknown) => void }
				).setOption(name, value),
			updateSize: () => api.updateSize?.(),
		}
	}, [])

	const handleNavDate = useCallback(
		(date: Date) => {
			if (!onNavDate) {
				return
			}
			const timestamp = date?.getTime?.()
			if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
				onNavDate(date)
				return
			}
			const signature = `${currentView}:${timestamp}`
			if (lastNavSignatureRef.current === signature) {
				return
			}
			lastNavSignatureRef.current = signature
			onNavDate(date)
		},
		[currentView, onNavDate]
	)

	useEffect(() => {
		lastNavSignatureRef.current = null
	}, [])

	const viewDidMountCb = useMemo(
		() => createViewDidMount(getApiAdapter, onViewDidMount),
		[getApiAdapter, onViewDidMount]
	)
	const datesSetCb = useMemo(
		() => createDatesSet(getApiAdapter, onDatesSet, handleNavDate),
		[getApiAdapter, onDatesSet, handleNavDate]
	)

	// Removed any-cast getter in favor of adapter

	// Update slot times via API
	useSlotTimesEffect(getApiAdapter, slotTimes)

	// Toggle validRange based on freeRoam/view
	useValidRangeEffect(getApiAdapter, freeRoam, currentView)

	// Resize/visibility/focus observers
	useCalendarResize(getApiAdapter, () => containerRef.current)

	// (removed) _handleEventAllow was unused; relying on other constraints

	// Track in-flight and queued changes per event for fluid UX (reserved for future use)
	// const _processingEvents = useRef(new Set<string>());
	// const _queuedTargets = useRef(
	// 	new Map<string, { startStr: string; endStr?: string }>(),
	// );

	// Batched event change handler to prevent duplicate mutations when updating multiple properties
	const EVENT_CHANGE_DEBOUNCE_MS = 50
	const {
		handler: handleEventChangeWithProcessing,
		cleanup: cleanupBatchedEvents,
	} = useBatchedEventChangeWithCleanup(
		onEventChange ??
			(() => {
				// No-op default handler
			}),
		EVENT_CHANGE_DEBOUNCE_MS
	)

	// Cleanup batched events on unmount
	React.useEffect(
		() => () => {
			cleanupBatchedEvents()
		},
		[cleanupBatchedEvents]
	)

	// // Navigate calendar when currentDate prop changes
	// useEffect(() => {
	//   if (calendarRef.current) {
	//     const api = calendarRef.current.getApi();
	//     const viewStart = api.getDate(); // current anchor date
	//     if (viewStart.getTime() !== currentDate.getTime()) {
	//       api.gotoDate(currentDate);
	//     }
	//   }
	// }, [currentDate]);

	// Modifier key classes (Alt/Shift)
	useModifierKeyClasses(() => containerRef.current)

	return (
		<div
			className={`h-full w-full max-w-full overflow-hidden ${currentView === 'listMonth' || currentView === 'multiMonthYear' ? '' : 'min-h-[37.5rem]'} ${getCalendarClassNames(currentView)}`}
			data-free-roam={freeRoam}
			ref={containerRef}
		>
			{mountReady && (
				<FullCalendar
					businessHours={businessHours}
					buttonIcons={{
						prev: 'chevron-left',
						next: 'chevron-right',
					}}
					contentHeight={calendarHeight}
					editable={true}
					eventDurationEditable={false}
					eventOverlap={true}
					eventStartEditable={true}
					// Header configuration - disable native toolbar since we use dock navbar
					events={renderEvents}
					// Enhanced calendar options
					expandRows={true}
					headerToolbar={false}
					height={calendarHeight}
					initialDate={currentDate}
					initialView={currentView}
					navLinks={navLinksEnabled}
					nowIndicator={true}
					plugins={[
						multiMonthPlugin,
						dayGridPlugin,
						timeGridPlugin,
						listPlugin,
						interactionPlugin,
					]}
					ref={calendarRef}
					selectable={true}
					selectMinDistance={0}
					selectMirror={false}
					slotDuration={{ hours: SLOT_DURATION_HOURS }}
					unselectAuto={false}
					// Business hours and constraints
					weekNumbers={false}
					// Only enforce constraints in timeGrid views so month/week drags are not blocked
					{...constraintsProp}
					hiddenDays={hiddenDays}
					selectAllow={handleSelectAllow}
					// Valid range for navigation
					{...validRangeProp}
					// View-specific overrides for multiMonthYear
					// Only use aspectRatio when height is auto, otherwise let height control the size
					{...(calendarHeight === 'auto'
						? { aspectRatio: CALENDAR_ASPECT_RATIO }
						: {})}
					// Dynamic slot times
					dayMaxEventRows={eventDisplayLimits.dayMaxEventRows}
					dayMaxEvents={eventDisplayLimits.dayMaxEvents}
					// Localization and Timezone (critical - matches Python implementation)
					direction={calendarDirection}
					displayEventTime={true}
					eventDisplay="block"
					eventTimeFormat={eventTimeFormat}
					// Multi-month specific options
					firstDay={calendarFirstDay}
					fixedWeekCount={false}
					locale={calendarLocale}
					moreLinkClick={eventDisplayLimits.moreLinkClick}
					multiMonthMaxColumns={3}
					multiMonthMinWidth={280}
					showNonCurrentDates={false}
					slotMaxTime={slotTimes.slotMaxTime}
					slotMinTime={slotTimes.slotMinTime}
					timeZone={timezone}
					views={viewsProp as never}
					// Interaction control
					// Block drag/resizes in vacation periods while allowing event clicks
					{...(isVacationDate
						? {
								// FullCalendar's type expects (dropInfo, draggedEvent) but for resizes it passes (resizeInfo)
								// We only care about the new start/end range to validate against vacations
								eventAllow: (dropInfo: { start?: Date; end?: Date }) =>
									handleEventAllow(dropInfo),
							}
						: {})}
					// Styling
					dayCellClassNames={getDayCellClassNames}
					dayHeaderClassNames={getDayHeaderClassNames}
					eventClassNames={eventClassNamesMemo}
					eventContent={eventContentMemo}
					viewClassNames="bg-card rounded-lg shadow-sm"
					// Event callbacks - use enhanced handler for eventChange
					{...(onDateClick ? { dateClick: onDateClick } : {})}
					{...(onSelect ? { select: onSelect } : {})}
					{...(onEventClick ? { eventClick: onEventClick } : {})}
					datesSet={datesSetCb}
					eventChange={handleEventChangeWithProcessing}
					eventDidMount={handleEventDidMountCb}
					viewDidMount={viewDidMountCb}
					{...(onEventMouseEnter ? { eventMouseEnter: onEventMouseEnter } : {})}
					{...(onEventMouseLeave ? { eventMouseLeave: onEventMouseLeave } : {})}
					droppable={Boolean(droppable)}
					eventDragStart={(info) => {
						;(
							globalThis as { __isCalendarDragging?: boolean }
						).__isCalendarDragging = true
						if (onEventDragStart) {
							const e = info.event
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date())
							onEventDragStart({
								event: {
									id: String(e.id),
									title: String(e.title || ''),
									start: safeStart,
									...(e.end ? { end: e.end } : {}),
									extendedProps: { ...(e.extendedProps || {}) },
								},
								el: info.el as HTMLElement,
								jsEvent: info.jsEvent as MouseEvent,
							})
						}
					}}
					// Time grid specific options
					eventDragStop={(info) => {
						;(
							globalThis as { __isCalendarDragging?: boolean }
						).__isCalendarDragging = false
						if (onEventDragStop) {
							const e = info.event
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date())
							onEventDragStop({
								event: {
									id: String(e.id),
									title: String(e.title || ''),
									start: safeStart,
									...(e.end ? { end: e.end } : {}),
									extendedProps: { ...(e.extendedProps || {}) },
								},
								el: info.el as HTMLElement,
								jsEvent: info.jsEvent as MouseEvent,
							})
						}
					}}
					slotLabelFormat={{
						hour: 'numeric',
						minute: '2-digit',
						omitZeroMinute: true,
						meridiem: 'short',
					}}
					// Drag and drop options
					slotLabelInterval={{ hours: 1 }}
					{...(onEventReceive
						? {
								eventReceive: (info: unknown) =>
									onEventReceive(
										info as { event: EventApi; draggedEl: HTMLElement }
									),
							}
						: {})}
					{...(onEventLeave
						? {
								eventLeave: (info: unknown) =>
									onEventLeave(
										info as { event?: EventApi; draggedEl: HTMLElement }
									),
							}
						: {})}
				/>
			)}
		</div>
	)
}

CalendarCoreComponent.displayName = 'CalendarCore'

export const CalendarCore = CalendarCoreComponent
