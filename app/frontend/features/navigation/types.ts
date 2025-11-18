import type * as React from 'react'
import type { CalendarCoreRef } from '@/features/calendar'

export type DockNavProps = {
	className?: string
	currentCalendarView?: string
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null
	onCalendarViewChange?: (view: string) => void
	navigationOnly?: boolean
	variant?: 'default' | 'left' | 'right'
	settingsOpen?: boolean
	onSettingsOpenChange?: (open: boolean) => void
	/**
	 * Optional layout mode. "centered" preserves the default row layout.
	 * "drawerThreeColumn" arranges arrows on the left, date centered,
	 * and settings plus badge on the right.
	 */
	layout?: 'centered' | 'drawerThreeColumn' | 'headerThreeColumn' | 'left'
	// Drawer-specific options to avoid page navigation and hide page links
	onlyLocalNavigation?: boolean
	hidePageLinks?: boolean
	hideSettings?: boolean
	dualModeTopDock?: boolean
}

export type NavigationControlsProps = {
	isLocalized?: boolean
	isCalendarPage?: boolean
	isPrevDisabled?: boolean
	isNextDisabled?: boolean
	onPrev?: () => void
	onNext?: () => void
	className?: string
	compact?: boolean
}

export type NavigationDateButtonProps = {
	title?: string
	isLocalized?: boolean
	isCalendarPage?: boolean
	isTodayDisabled?: boolean
	onToday?: () => void
	navigationOnly?: boolean
	className?: string
	visibleEventCount?: number
	/** When false, hides the floating event count badge overlay */
	showBadge?: boolean
}

export type NavigationLinksProps = {
	isLocalized?: boolean
	isActive?: (href: string) => boolean
	className?: string
}

export type ViewMode = {
	value: 'default' | 'freeRoam' | 'dual'
	label: string
	labelRTL: string
}

type NavigationState = {
	mounted: boolean
	isHoveringDate: boolean
	activeTab: string
}

type NavigationContextValue = {
	state: NavigationState
	handlers: {
		setIsHoveringDate: (value: boolean) => void
		setActiveTab: (value: string) => void
		handleLanguageToggle: (checked: boolean) => void
		handleThemeToggle: (checked: boolean) => void
		handleViewModeChange: (value: ViewMode['value']) => void
		handleCalendarViewChange: (view: string) => void
	}
	computed: {
		viewMode: ViewMode['value']
		isRecording: boolean
		isActive: (href: string) => boolean
	}
}

export interface ExtendedNavigationContextValue extends NavigationContextValue {
	navigation: {
		title: string
		activeView: string
		isPrevDisabled: boolean
		isNextDisabled: boolean
		isTodayDisabled: boolean
		handlePrev: () => void
		handleNext: () => void
		handleToday: () => void
		isCalendarPage: boolean
		isDocumentsPage: boolean
		isLocalized: boolean
		visibleEventCount: number
	}
}

export type ThemeOption = {
	value: string
	name: string
	nameRTL: string
	colors: {
		primary: string
		secondary: string
	}
	borderStyle?: string
}
