'use client'

import { useKeyboardRepeatNavigation } from '@shared/libs/hooks/use-keyboard-repeat-navigation'
import { useLongPressRepeat } from '@shared/libs/hooks/use-long-press-repeat'
import type { RefObject } from 'react'
import { useRef } from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import { getCalendarViewOptions, useCalendarToolbar } from '@/features/calendar'
import { SimpleDockBase } from '@/shared/ui/simple-dock-base'

type CalendarDockProps = {
	className?: string
	currentView?: string
	calendarRef?: RefObject<CalendarCoreRef | null> | null
	freeRoam?: boolean
	isLocalized?: boolean
}

export function CalendarDock({
	className = '',
	currentView = 'timeGridWeek',
	calendarRef,
	freeRoam: _freeRoam = false,
	isLocalized = false,
}: CalendarDockProps) {
	// Create a stable ref if none provided
	const fallbackRef = useRef<CalendarCoreRef | null>(null)
	const effectiveCalendarRef = calendarRef || fallbackRef

	// Use the custom hook for calendar navigation logic
	const {
		title,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		handlePrev,
		handleNext,
		handleToday,
	} = useCalendarToolbar({
		calendarRef: effectiveCalendarRef,
		currentView,
	})

	const prevHoldHandlers = useLongPressRepeat(handlePrev, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isPrevDisabled,
	})
	const nextHoldHandlers = useLongPressRepeat(handleNext, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isNextDisabled,
	})

	useKeyboardRepeatNavigation({
		onLeft: handlePrev,
		onRight: handleNext,
		onCtrlUp: () => {
			try {
				const opts = getCalendarViewOptions(isLocalized)
				const currentIndex = opts.findIndex((o) => o.value === currentView)
				const nextIndex = (currentIndex - 1 + opts.length) % opts.length
				const view = opts[nextIndex]?.value || 'multiMonthYear'
				// Prevent view switching in simple dock when using list-only contexts
				if (currentView === 'listMonth') {
					return
				}
				const api = effectiveCalendarRef.current?.getApi?.()
				api?.changeView?.(view)
			} catch {
				// Ignore errors when changing calendar view
			}
		},
		onCtrlDown: () => {
			try {
				const opts = getCalendarViewOptions(isLocalized)
				const currentIndex = opts.findIndex((o) => o.value === currentView)
				const nextIndex = (currentIndex + 1) % opts.length
				const view = opts[nextIndex]?.value || 'multiMonthYear'
				// Prevent view switching in simple dock when using list-only contexts
				if (currentView === 'listMonth') {
					return
				}
				const api = effectiveCalendarRef.current?.getApi?.()
				api?.changeView?.(view)
			} catch {
				// Ignore errors when changing calendar view with Ctrl
			}
		},
		disabledLeft: isPrevDisabled,
		disabledRight: isNextDisabled,
		startDelayMs: 2000,
		intervalMs: 333,
		// Disable repeat navigation for mini dock in sidebar to avoid loops
		isSidebarOpen: true,
	})

	return (
		<SimpleDockBase
			className={className}
			isLocalized={isLocalized}
			isNextDisabled={isNextDisabled}
			isPrevDisabled={isPrevDisabled}
			isTodayDisabled={isTodayDisabled}
			nextHoldHandlers={nextHoldHandlers}
			onNext={handleNext}
			onPrev={handlePrev}
			onToday={handleToday}
			prevHoldHandlers={prevHoldHandlers}
			title={title}
		/>
	)
}
