'use client'

import { createCalendarCallbacks } from '@shared/libs/calendar/calendar-callbacks'
import {
	getTimezone,
	SLOT_DURATION_HOURS,
} from '@shared/libs/calendar/calendar-config'
// Removed useReservationsData - now using TanStack Query period-based queries via useCalendarEvents
import { mark } from '@shared/libs/dev-profiler'
import { useDockBridge } from '@shared/libs/dock-bridge-context'
import { useLanguage } from '@shared/libs/state/language-context'
import { useSettings } from '@shared/libs/state/settings-context'
import { useVacation } from '@shared/libs/state/vacation-context'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import React from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import {
	alignAndSortEventsForCalendar,
	filterEventsForCalendar,
	useCalendarContextMenu,
	useCalendarDragHandlers,
	useCalendarEventHandlers,
	useCalendarEvents,
	useCalendarHoverCard,
	useCalendarState,
	useVacationDateChecker,
} from '@/features/calendar'
import { useCalendarPeriodData } from '@/features/calendar/hooks/useCalendarPeriodData'
import { useCalendarDataTableEditor } from '@/features/data-table'
import { SidebarInset } from '@/shared/ui/sidebar'
import { CalendarContainer, CalendarSkeleton } from '..'

// FullCalendar component is loaded dynamically in DualCalendarComponent when needed

const DualCalendarComponent = dynamic(
	() =>
		import('@/widgets/calendar/DualCalendar').then((mod) => ({
			default: mod.DualCalendarComponent,
		})),
	{
		loading: () => <CalendarSkeleton />,
		ssr: false,
	}
)

const CalendarMainContent = dynamic(
	() =>
		import('@/widgets/calendar/CalendarMainContent').then(
			(m) => m.CalendarMainContent
		),
	{ ssr: false, loading: () => <CalendarSkeleton /> }
)
const CalendarDataTableEditorWrapper = dynamic(
	() =>
		import(
			'@/widgets/data-table-editor/calendar-data-table-editor-wrapper'
		).then((m) => m.CalendarDataTableEditorWrapper),
	{ ssr: false }
)

const WRAPPER_BOTTOM_INSET_PX = 12
const WRAPPER_TOP_PADDING_PX = 4 // pt-1
const CARD_PADDING_VERTICAL_PX = 16 // p-2 = 8px top + 8px bottom
const CARD_BORDER_VERTICAL_PX = 2 // border = 1px top + 1px bottom
const CARD_CHROME_VERTICAL_PX =
	CARD_PADDING_VERTICAL_PX + CARD_BORDER_VERTICAL_PX
const DEFAULT_MIN_CALENDAR_HEIGHT = 600

export function HomeCalendar() {
	const { freeRoam, showDualCalendar } = useSettings()
	const {
		vacationPeriods,
		handleDateClick: handleVacationDateClick,
		recordingState,
	} = useVacation()
	const isVacationDate = useVacationDateChecker(vacationPeriods)

	// Persist settings popover state across mode switches (used in local header variant)
	// const [settingsOpen, setSettingsOpen] = React.useState(false);

	// Avoid hydration mismatch: compute dynamic layout only after mount
	const [mounted, setMounted] = React.useState(false)
	React.useEffect(() => {
		setMounted(true)
		mark('HomeCalendar:mounted')
	}, [])

	React.useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}
		const updateCalendarDvh = () => {
			try {
				const vh = Math.max(
					0,
					Math.floor(window.visualViewport?.height || window.innerHeight || 0)
				)
				document.documentElement.style.setProperty('--calendar-dvh', `${vh}px`)
			} catch {
				// CSS custom property set failed - continue without dynamic viewport height
			}
		}
		updateCalendarDvh()
		window.addEventListener('resize', updateCalendarDvh)
		try {
			window.visualViewport?.addEventListener?.('resize', updateCalendarDvh)
		} catch {
			// Visual viewport listener setup failed - continue without it
		}
		return () => {
			window.removeEventListener('resize', updateCalendarDvh)
			try {
				window.visualViewport?.removeEventListener?.(
					'resize',
					updateCalendarDvh
				)
			} catch {
				// Visual viewport listener cleanup failed - continue cleanup
			}
		}
	}, [])

	// Use refs to capture calendar instances for integration with other components
	const calendarRef = React.useRef<CalendarCoreRef | null>(null)
	const wrapperRef = React.useRef<HTMLDivElement | null>(null)

	// CalendarCore will populate calendarRef directly through forwardRef
	const { isLocalized } = useLanguage()

	// Stage I: adopt useCalendarState for robust view/date/slotTimes (must be before useCalendarEvents)
	const calendarState = useCalendarState({
		freeRoam,
		initialView: 'timeGridWeek',
		storageKeyPrefix: 'calendar:page',
	})

	// Get current period data from TanStack Query cache (for hover cards)
	// NOTE: We don't load all events anymore - only period-based queries via useCalendarEvents
	const { getCurrentPeriodData } = useCalendarPeriodData({
		currentView: calendarState.currentView,
		currentDate: calendarState.currentDate,
		freeRoam,
	})

	const mappedConversations = React.useMemo(() => {
		const conversations = getCurrentPeriodData().conversations
		// Convert CalendarConversationEvent[] to ConversationMessage[] format
		const out: Record<
			string,
			import('@/entities/conversation').ConversationMessage[]
		> = {}
		for (const [waId, events] of Object.entries(conversations || {})) {
			if (Array.isArray(events) && events.length > 0) {
				out[waId] = events.map((event) => ({
					role: event.role || 'user',
					message: event.message || '',
					time: event.time || '',
					date: event.date || '',
				}))
			}
		}
		return out
	}, [getCurrentPeriodData])

	const mappedReservations = React.useMemo(
		() => getCurrentPeriodData().reservations,
		[getCurrentPeriodData]
	)

	// Stage C: Load events via existing hook, passing resolved ages for first-paint accuracy
	const eventsState = useCalendarEvents({
		freeRoam,
		isLocalized,
		currentView: calendarState.currentView,
		currentDate: calendarState.currentDate,
		autoRefresh: false,
	})

	// Get vacation events from context
	const { vacationEvents } = useVacation()

	// Memoize filtered events to avoid triggering FullCalendar eventsSet on every render
	const filteredEvents = React.useMemo(
		() => filterEventsForCalendar(eventsState.events, freeRoam),
		[eventsState.events, freeRoam]
	)

	// Align and sort events for timegrid views (ensures proper time slot alignment)
	const alignedEvents = React.useMemo(
		() =>
			alignAndSortEventsForCalendar(
				filteredEvents,
				freeRoam,
				calendarState.currentView
			),
		[filteredEvents, freeRoam, calendarState.currentView]
	)

	// Merge vacation events with main events
	const allEvents = React.useMemo(() => {
		const merged = [...alignedEvents, ...vacationEvents]
		return merged
	}, [alignedEvents, vacationEvents])

	// Stage G: Add simple height management and updateSize wiring
	const [calendarHeight, setCalendarHeight] = React.useState<number | 'auto'>(
		'auto'
	)
	const [isRefreshing, setIsRefreshing] = React.useState(false)
	const computeAvailableHeight = React.useCallback(() => {
		if (typeof window === 'undefined') {
			return DEFAULT_MIN_CALENDAR_HEIGHT
		}
		const viewport =
			window.visualViewport?.height ??
			window.innerHeight ??
			DEFAULT_MIN_CALENDAR_HEIGHT
		const wrapperTop = wrapperRef.current?.getBoundingClientRect().top ?? 0
		// Subtract: wrapper top padding (pt-1), card padding/border, and bottom inset
		// wrapperTop is the outer edge, so we need to account for padding inside
		const available =
			viewport -
			wrapperTop -
			WRAPPER_TOP_PADDING_PX -
			CARD_CHROME_VERTICAL_PX -
			WRAPPER_BOTTOM_INSET_PX
		return Math.max(
			DEFAULT_MIN_CALENDAR_HEIGHT,
			Math.floor(
				Number.isFinite(available) ? available : DEFAULT_MIN_CALENDAR_HEIGHT
			)
		)
	}, [])
	const handleRefreshWithBlur = React.useCallback(async () => {
		setIsRefreshing(true)
		try {
			await eventsState.refreshData()
		} finally {
			const REFRESH_BLUR_DELAY_MS = 300
			setTimeout(() => setIsRefreshing(false), REFRESH_BLUR_DELAY_MS)
		}
	}, [eventsState])
	// Stable updateSize handler to avoid re-creating ResizeObservers downstream
	const handleCalendarUpdateSize = React.useCallback(() => {
		setCalendarHeight((prev) =>
			prev === 'auto' ? prev : computeAvailableHeight()
		)
		try {
			const api = calendarRef.current?.getApi?.()
			if (api && (api as { view?: unknown }).view) {
				calendarRef.current?.updateSize?.()
			}
		} catch {
			// Ignore errors when updating calendar size - component may not be ready
		}
	}, [computeAvailableHeight])

	const handleCalendarHeightChange = React.useCallback(
		(value: number | 'auto') => {
			if (value === 'auto') {
				setCalendarHeight('auto')
				return
			}
			setCalendarHeight(computeAvailableHeight())
		},
		[computeAvailableHeight]
	)

	// Stage J: Enable real hover card + drag handlers (others stay inert)
	const closeHoverCardRef = React.useRef<(() => void) | null>(null)
	const dragHandlers = useCalendarDragHandlers({
		closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
	})
	const hoverCard = useCalendarHoverCard({
		isDragging: dragHandlers.isDragging,
	})
	closeHoverCardRef.current = hoverCard.closeHoverCardImmediately

	// Stage K: Enable real context menu manager
	const contextMenu = useCalendarContextMenu()

	// No need for complex callback ref - CalendarCore will populate calendarRef directly
	// Note: calendarState is now defined earlier in the component (before useCalendarEvents)

	React.useEffect(() => {
		if (!mounted) {
			return
		}
		if (
			calendarState.currentView === 'multiMonthYear' ||
			calendarState.currentView === 'listMonth'
		) {
			setCalendarHeight('auto')
			return
		}
		setCalendarHeight(computeAvailableHeight())
	}, [mounted, calendarState.currentView, computeAvailableHeight])

	React.useEffect(() => {
		if (!mounted) {
			return
		}
		const handleResize = () => {
			if (
				calendarState.currentView === 'multiMonthYear' ||
				calendarState.currentView === 'listMonth'
			) {
				return
			}
			setCalendarHeight(computeAvailableHeight())
		}
		handleResize()
		window.addEventListener('resize', handleResize)
		try {
			window.visualViewport?.addEventListener?.('resize', handleResize)
		} catch {
			// Visual viewport listener not supported - ignore
		}
		return () => {
			window.removeEventListener('resize', handleResize)
			try {
				window.visualViewport?.removeEventListener?.('resize', handleResize)
			} catch {
				// ignore cleanup errors
			}
		}
	}, [mounted, calendarState.currentView, computeAvailableHeight])

	// Stage M: Enable real data-table editor state
	const dataTableEditor = useCalendarDataTableEditor()

	// Initialize event handlers now that calendarState exists
	const { openConversation: openConversationFromStore } = useSidebarChatStore()
	const router = useRouter()

	const handleOpenDocument = React.useCallback(
		(waId: string) => {
			// Navigate to documents page with waId as query parameter
			router.push(`/documents?waId=${encodeURIComponent(waId)}`)
		},
		[router]
	)

	const eventHandlers = useCalendarEventHandlers({
		events: allEvents,
		conversations: {},
		isLocalized,
		currentView: calendarState.currentView,
		isVacationDate,
		handleRefreshWithBlur: async () => {
			// No-op: refresh handled elsewhere
		},
		openConversation: openConversationFromStore,
		addEvent: eventsState.addEvent,
		updateEvent: eventsState.updateEvent,
		removeEvent: eventsState.removeEvent,
		dataTableEditor: {
			handleEditReservation: () => {
				// No-op: handled by dataTableEditor state
			},
		},
		calendarRef,
	})

	// Build calendar callbacks (dateClick/select/eventClick) using the event handlers
	const callbacks = React.useMemo(
		() =>
			createCalendarCallbacks({
				handlers: {
					isLocalized,
					currentView: calendarState.currentView,
					isVacationDate,
					openEditor: (opts: { start: string; end?: string }) => {
						const startStr = String(opts.start)
						const endStr = typeof opts.end === 'string' ? opts.end : startStr
						dataTableEditor.openEditor({ start: startStr, end: endStr })
					},
					handleOpenConversation: eventHandlers.handleOpenConversation,
					handleEventChange: eventHandlers.handleEventChange,
				},
				freeRoam,
				timezone: getTimezone(),
				currentDate: calendarState.currentDate,
				...(recordingState.periodIndex !== null &&
					recordingState.field !== null && {
						handleVacationDateClick,
					}),
				setCurrentDate: calendarState.setCurrentDate,
				currentView: calendarState.currentView,
			}),
		[
			isLocalized,
			calendarState.currentView,
			isVacationDate,
			dataTableEditor.openEditor,
			eventHandlers.handleOpenConversation,
			eventHandlers.handleEventChange,
			freeRoam,
			calendarState.currentDate,
			recordingState.periodIndex,
			recordingState.field,
			handleVacationDateClick,
			calendarState.setCurrentDate,
		]
	)

	// Vacation events are now automatically included in allEvents array - no manual insertion needed

	const [rightCalendarView, setRightCalendarView] = React.useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('dual-right-calendar-view') || 'timeGridWeek'
		}
		return 'timeGridWeek'
	})

	// Save to localStorage when views change
	// Persist current view (optional)
	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('dual-left-calendar-view', calendarState.currentView)
		}
	}, [calendarState.currentView])

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('dual-right-calendar-view', rightCalendarView)
		}
	}, [rightCalendarView])

	// Track dual calendar refs directly with guard to avoid re-render loops
	const [leftCalendarRef, setLeftCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef | null> | null>(null)
	const [rightCalendarRef, setRightCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef | null> | null>(null)

	// Ref object to capture the dual calendar refs
	const dualCalendarRefObject = React.useRef<{
		leftCalendarRef: React.RefObject<CalendarCoreRef | null>
		rightCalendarRef: React.RefObject<CalendarCoreRef | null>
		leftView: string
		rightView: string
	} | null>(null)

	// Callback ref to capture the dual calendar refs when they become available
	const dualCalendarCallbackRef = React.useCallback(
		(
			dualCalendarInstance: {
				leftCalendarRef: React.RefObject<CalendarCoreRef | null>
				rightCalendarRef: React.RefObject<CalendarCoreRef | null>
				leftView: string
				rightView: string
			} | null
		) => {
			mark('HomeCalendar:dualCalendarCallbackRef')
			dualCalendarRefObject.current = dualCalendarInstance
			if (dualCalendarInstance) {
				setLeftCalendarRef((prev) =>
					prev !== dualCalendarInstance.leftCalendarRef
						? dualCalendarInstance.leftCalendarRef
						: prev
				)
				setRightCalendarRef((prev) =>
					prev !== dualCalendarInstance.rightCalendarRef
						? dualCalendarInstance.rightCalendarRef
						: prev
				)
			}
		},
		[]
	)

	// Bridge calendar control into the persistent dock header
	const { setState: setDockBridgeState } = useDockBridge()
	React.useEffect(() => {
		setDockBridgeState({
			calendarRef: (showDualCalendar
				? leftCalendarRef || null
				: calendarRef) as React.RefObject<CalendarCoreRef | null>,
			currentCalendarView: calendarState.currentView,
			onCalendarViewChange: calendarState.setCurrentView,
			// Dual: provide right-side bridge values as well
			...(showDualCalendar
				? {
						rightCalendarRef: rightCalendarRef || null,
						rightCalendarView,
						onRightCalendarViewChange: setRightCalendarView,
					}
				: {}),
		})
	}, [
		showDualCalendar,
		leftCalendarRef,
		rightCalendarRef,
		rightCalendarView,
		calendarState.currentView,
		calendarState.setCurrentView,
		setDockBridgeState,
	])

	return (
		<SidebarInset className="overflow-hidden" style={{ height: '100%' }}>
			<div className="flex h-full flex-1 flex-col px-4 pt-1" ref={wrapperRef}>
				<CalendarContainer
					isHydrated={mounted}
					isRefreshing={mounted ? isRefreshing : false}
					loading={!mounted}
				>
					{mounted && (
						<div className="flex h-full flex-1 flex-col rounded-lg border border-border/50 bg-card/50 p-2">
							{showDualCalendar ? (
								<DualCalendarComponent
									events={allEvents}
									freeRoam={freeRoam}
									initialLeftView={calendarState.currentView}
									initialRightView={rightCalendarView}
									loading={eventsState.loading}
									onLeftViewChange={calendarState.setCurrentView}
									onRefreshData={handleRefreshWithBlur}
									onRightViewChange={setRightCalendarView}
									ref={dualCalendarCallbackRef}
								/>
							) : (
								<CalendarMainContent
									calendarHeight={calendarHeight}
									calendarRef={calendarRef}
									callbacks={callbacks}
									contextMenu={contextMenu}
									conversations={mappedConversations}
									currentDate={calendarState.currentDate}
									currentView={calendarState.currentView}
									dataTableEditor={{
										handleEditReservation: () => {
											// No-op: handled by dataTableEditor state
										},
									}}
									dragHandlers={dragHandlers}
									events={allEvents}
									freeRoam={freeRoam}
									handleCancelReservation={
										eventHandlers.handleCancelReservation
									}
									handleEventChange={eventHandlers.handleEventChange}
									handleOpenConversation={(id) => openConversationFromStore(id)}
									handleOpenDocument={handleOpenDocument}
									handleUpdateSize={handleCalendarUpdateSize}
									handleViewDetails={() => {
										// No-op: view details handled elsewhere
									}}
									hoverCard={hoverCard}
									isHydrated={true}
									isLocalized={isLocalized}
									isVacationDate={isVacationDate}
									onViewChange={calendarState.setCurrentView}
									processedEvents={allEvents}
									reservations={mappedReservations}
									setCalendarHeight={handleCalendarHeightChange}
									setCurrentDate={calendarState.setCurrentDate}
									setCurrentView={calendarState.setCurrentView}
									slotTimes={calendarState.slotTimes}
									slotTimesKey={calendarState.slotTimesKey}
								/>
							)}

							<CalendarDataTableEditorWrapper
								calendarRef={calendarRef}
								closeEditor={dataTableEditor.closeEditor}
								editorOpen={dataTableEditor.editorOpen}
								events={allEvents}
								freeRoam={freeRoam}
								isLocalized={isLocalized}
								onEventAdded={
									eventHandlers.handleEventAdded ??
									(() => {
										// No-op fallback
									})
								}
								onEventCancelled={
									eventHandlers.handleEventCancelled ??
									(() => {
										// No-op fallback
									})
								}
								onEventModified={
									eventHandlers.handleEventModified ??
									(() => {
										// No-op fallback
									})
								}
								onOpenChange={dataTableEditor.setEditorOpen}
								onSave={handleRefreshWithBlur}
								selectedDateRange={dataTableEditor.selectedDateRange}
								setShouldLoadEditor={dataTableEditor.setShouldLoadEditor}
								shouldLoadEditor={dataTableEditor.shouldLoadEditor}
								slotDurationHours={SLOT_DURATION_HOURS}
							/>
						</div>
					)}
				</CalendarContainer>
			</div>
			{/** Toaster is provided globally via ToastRouter in `app/layout.tsx` */}
		</SidebarInset>
	)
}
