'use client'

import { useDockBridge } from '@shared/libs/dock-bridge-context'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import {
	isValidElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import { useCalendarCore } from '@/features/calendar'
import { useNavigationView } from '@/features/navigation'
import { DockNav } from '@/features/navigation/dock-nav'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/shared/ui/sheet'
import { ThemedScrollbar } from '@/shared/ui/themed-scrollbar'
import { CalendarContainer, CalendarMainContent } from '.'

type CalendarDrawerProps = {
	className?: string
	trigger?: ReactNode
	side?: 'left' | 'right' | 'top' | 'bottom'
	initialView?: string
	title?: string
	disableDateClick?: boolean
	/** Persist calendar state under this prefix; defaults to documents drawer */
	storageKeyPrefix?: string
}

/**
 * CalendarDrawer renders a minimal calendar inside a drawer/sheet.
 * It reuses centralized calendar logic via useCalendarCore and CalendarMainContent.
 * Date click behavior can be disabled via prop and is intentionally modular.
 */
export function CalendarDrawer({
	className,
	trigger,
	side = 'right',
	initialView = 'listMonth',
	title = 'Calendar',
	disableDateClick = true,
	storageKeyPrefix = 'documents:calendar-drawer',
}: CalendarDrawerProps) {
	const [open, setOpen] = useState(false)
	const didInitOnOpenRef = useRef(false)

	// Ensure component only renders after hydration to avoid ID mismatches
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])

	// Centralized calendar state/logic
	const {
		calendarRef,
		calendarState,
		eventsState,
		processedEvents,
		calendarHeight,
		isRefreshing,
		isVacationDate,
		contextMenu,
		hoverCardWithDragging,
		dragHandlers,
		eventHandlers,
		callbacks: baseCallbacks,
		handleUpdateSize,
		setCalendarHeight,
		reservations,
		isLocalized,
	} = useCalendarCore({
		freeRoam: true,
		initialView,
		storageKeyPrefix,
		excludeConversations: true,
	})

	// Sync current view with feature navigation state
	const { setView } = useNavigationView()
	useEffect(() => {
		try {
			if (calendarState.currentView) {
				setView(calendarState.currentView)
			}
		} catch {
			// Ignore errors when syncing calendar view with navigation state
		}
	}, [calendarState.currentView, setView])

	// Direct view change handler to affect this calendar instance even off calendar page
	const handleViewChangeDirect = useCallback(
		(view: string) => {
			try {
				const api = calendarRef?.current?.getApi?.()
				if (api) {
					try {
						api.setOption('validRange', undefined)
						api.setOption('eventConstraint', undefined)
						api.setOption('selectConstraint', undefined)
					} catch {
						// Ignore errors when clearing calendar constraints
					}
					try {
						api.changeView(view)
					} catch {
						// Ignore errors when changing calendar view
					}
					try {
						requestAnimationFrame(() => {
							try {
								api.updateSize?.()
							} catch {
								// Ignore errors when updating calendar size
							}
						})
					} catch {
						// Ignore errors when scheduling calendar size update
					}
				}
			} finally {
				calendarState.setCurrentView(view)
			}
		},
		[calendarRef, calendarState.setCurrentView]
	)

	// Keep stable refs for functions used inside open effect
	const setCurrentDateRef = useRef(calendarState.setCurrentDate)
	useEffect(() => {
		setCurrentDateRef.current = calendarState.setCurrentDate
	}, [calendarState.setCurrentDate])
	const viewChangeDirectRef = useRef(handleViewChangeDirect)
	useEffect(() => {
		viewChangeDirectRef.current = handleViewChangeDirect
	}, [handleViewChangeDirect])

	// Reset to today and force list view only once per drawer open
	useEffect(() => {
		if (!open) {
			didInitOnOpenRef.current = false
			return
		}
		if (didInitOnOpenRef.current) {
			return
		}
		didInitOnOpenRef.current = true
		try {
			const api = calendarRef?.current?.getApi?.()
			api?.today?.()
		} catch {
			// Ignore errors when resetting calendar to today
		}
		try {
			setCurrentDateRef.current?.(new Date())
		} catch {
			// Ignore errors when setting current date
		}
		try {
			viewChangeDirectRef.current?.('listMonth')
		} catch {
			// Ignore errors when setting list view
		}
	}, [open, calendarRef])

	// Bridge for DockNav/Settings to control this calendar
	const { setState: setDockBridgeState } = useDockBridge()
	useEffect(() => {
		setDockBridgeState({
			calendarRef: (calendarRef || null) as RefObject<CalendarCoreRef | null>,
			currentCalendarView: calendarState.currentView,
			onCalendarViewChange: handleViewChangeDirect,
		})
	}, [
		handleViewChangeDirect,
		calendarRef,
		calendarState.currentView,
		setDockBridgeState,
	])

	// Optionally disable dateClick/select by overriding callbacks
	const callbacks = useMemo(() => {
		if (!disableDateClick) {
			return baseCallbacks
		}
		return {
			dateClick: () => {
				// Disabled in drawer mode
			},
			select: () => {
				// Disabled in drawer mode
			},
			// In drawer, allow clicking past reservations (pass through to default)
			eventClick: baseCallbacks.eventClick,
		}
	}, [baseCallbacks, disableDateClick])

	// Drawer width adapts to calendar view: list* views use 75vw, others expand
	const isListView = useMemo(() => {
		const view = calendarState.currentView || ''
		return view.startsWith('list')
	}, [calendarState.currentView])

	const drawerWidthClass = isListView
		? 'w-[clamp(320px,75vw,840px)]'
		: 'w-[95vw]'

	return (
		<>
			{mounted ? (
				<Sheet onOpenChange={setOpen} open={open}>
					{trigger ? (
						isValidElement(trigger) ? (
							<SheetTrigger asChild>{trigger}</SheetTrigger>
						) : (
							<SheetTrigger asChild>
								<Button variant="outline">Open Calendar</Button>
							</SheetTrigger>
						)
					) : (
						<SheetTrigger asChild>
							<Button variant="outline">Open Calendar</Button>
						</SheetTrigger>
					)}
					<SheetContent
						className={cn(
							`${drawerWidthClass} flex max-w-none flex-col overflow-hidden p-0 sm:max-w-none`,
							className
						)}
						side={side}
					>
						<SheetHeader className="border-b px-4 py-3">
							<SheetTitle>{title}</SheetTitle>
						</SheetHeader>

						{/* Dock similar to header dock, single-view settings */}
						<div className="px-2 py-1">
							{/* No external arrows; navigation is inside the dock */}
							<DockNav
								calendarRef={calendarRef}
								className="mt-0 w-full max-w-full overflow-x-auto"
								currentCalendarView={calendarState.currentView}
								layout="drawerThreeColumn"
								navigationOnly={true}
								onCalendarViewChange={handleViewChangeDirect}
							/>
						</div>

						<div className="min-h-0 flex-1 px-2 pt-0 pb-2">
							<ThemedScrollbar className="h-full w-full" noScrollX={true}>
								<CalendarContainer
									isHydrated={calendarState.isHydrated}
									isRefreshing={isRefreshing}
									loading={eventsState.loading}
								>
									<div className="calendar-drawer-calendar relative flex h-full w-full flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
										<style>{`
										.calendar-drawer-calendar :global(.fc) {
											height: 100%;
											width: 100%;
										}
										.calendar-drawer-calendar :global(.fc-view-harness),
										.calendar-drawer-calendar :global(.fc-scroller),
										.calendar-drawer-calendar :global(.fc-scroller-harness) {
											min-height: 100%;
										}
										.calendar-drawer-calendar :global(.fc-list-table) {
											width: 100%;
										}
									`}</style>
										<CalendarMainContent
											calendarHeight={calendarHeight}
											calendarRef={calendarRef}
											callbacks={callbacks}
											contextMenu={contextMenu}
											conversations={{}}
											currentDate={calendarState.currentDate}
											currentView={calendarState.currentView}
											dataTableEditor={{
												handleEditReservation: () => {
													// Disabled in drawer mode
												},
											}}
											disableHoverCards={true}
											disableNavLinks={true}
											dragHandlers={dragHandlers}
											events={eventsState.events}
											freeRoam={true}
											handleCancelReservation={
												eventHandlers.handleCancelReservation
											}
											handleEventChange={eventHandlers.handleEventChange}
											handleOpenConversation={(waId) => {
												try {
													window.dispatchEvent(
														new CustomEvent('doc:user-select', {
															detail: { waId },
														})
													)
												} catch {
													// Ignore errors when dispatching custom event
												}
												try {
													eventHandlers.handleOpenConversation(waId)
												} catch {
													// Ignore errors when opening conversation
												}
												try {
													setOpen(false)
												} catch {
													// Ignore errors when closing drawer
												}
											}}
											handleOpenDocument={(waId) => {
												try {
													window.dispatchEvent(
														new CustomEvent('doc:user-select', {
															detail: { waId },
														})
													)
													setOpen(false)
												} catch {
													// Ignore errors when opening document
												}
											}}
											handleUpdateSize={handleUpdateSize}
											handleViewDetails={() => {
												// Disabled in drawer mode
											}}
											hoverCard={hoverCardWithDragging}
											isHydrated={calendarState.isHydrated}
											isLocalized={isLocalized}
											isVacationDate={isVacationDate}
											processedEvents={processedEvents.filter(
												(e) => (e as { type?: string }).type !== 'conversation'
											)}
											reservations={reservations}
											setCalendarHeight={setCalendarHeight}
											setCurrentDate={calendarState.setCurrentDate}
											setCurrentView={calendarState.setCurrentView}
											slotTimes={calendarState.slotTimes}
											slotTimesKey={calendarState.slotTimesKey}
										/>
									</div>
								</CalendarContainer>
							</ThemedScrollbar>
						</div>
					</SheetContent>
				</Sheet>
			) : null}
		</>
	)
}
