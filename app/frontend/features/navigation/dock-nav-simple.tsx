'use client'

import { getValidRange } from '@shared/libs/calendar/calendar-config'
import { cn } from '@shared/libs/utils'
import { Button, buttonVariants } from '@ui/button'
import { Label } from '@ui/label'
import { Separator } from '@ui/separator'
import { BarChart3, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { memo, type RefObject, useEffect, useState } from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import { getCalendarViewOptions } from '@/features/calendar'
import { SettingsTabs } from '@/features/settings/settings'
import {
	useLanguageStore,
	useSettingsStore,
} from '@/infrastructure/store/app-store'
import { i18n } from '@/shared/libs/i18n'
import { ButtonGroup } from '@/shared/ui/button-group'
import { Dock, DockIcon } from '@/shared/ui/dock'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { PrefetchLink } from '@/shared/ui/prefetch-link'
import { StablePopoverButton } from '@/shared/ui/stable-popover-button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/shared/ui/tooltip'

type DockNavSimpleProps = {
	className?: string
	currentCalendarView?: string
	onCalendarViewChange?: (view: string) => void
	leftCalendarView?: string
	rightCalendarView?: string
	onLeftCalendarViewChange?: (view: string) => void
	onRightCalendarViewChange?: (view: string) => void
	leftCalendarRef?: RefObject<CalendarCoreRef | null> | null
	rightCalendarRef?: RefObject<CalendarCoreRef | null> | null
	isDualMode?: boolean
	settingsOpen?: boolean
	onSettingsOpenChange?: (open: boolean) => void
}

type DualCalendarViewSelectorProps = {
	isLocalized?: boolean
	leftCalendarView?: string
	rightCalendarView?: string
	onLeftCalendarViewChange?: (view: string) => void
	onRightCalendarViewChange?: (view: string) => void
	leftCalendarRef?: RefObject<CalendarCoreRef | null> | null
	rightCalendarRef?: RefObject<CalendarCoreRef | null> | null
	isDualMode?: boolean
}

export function DualCalendarViewSelector({
	isLocalized = false,
	leftCalendarView,
	rightCalendarView,
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef: _leftCalendarRef,
	rightCalendarRef: _rightCalendarRef,
}: DualCalendarViewSelectorProps) {
	const viewOptions = getCalendarViewOptions(isLocalized)

	return (
		<div className="grid grid-cols-2 gap-2">
			<div className="space-y-1.5">
				<Label className="block text-center text-[0.72rem] text-muted-foreground leading-none">
					{i18n.getMessage('left_calendar', isLocalized)}
				</Label>
				<ButtonGroup className="w-full" orientation="vertical">
					{viewOptions.map((option) => {
						const isSelected = leftCalendarView === option.value
						return (
							<Button
								className={cn(
									'justify-start',
									isSelected &&
										'bg-primary text-primary-foreground hover:bg-primary/90'
								)}
								key={`left-${option.value}`}
								onClick={() => {
									onLeftCalendarViewChange?.(option.value)
								}}
								size="sm"
								variant="outline"
							>
								<option.icon
									aria-hidden="true"
									className="opacity-70"
									size={16}
								/>
								{option.label}
							</Button>
						)
					})}
				</ButtonGroup>
			</div>

			<div className="space-y-1.5">
				<Label className="block text-center text-[0.72rem] text-muted-foreground leading-none">
					{i18n.getMessage('right_calendar', isLocalized)}
				</Label>
				<ButtonGroup className="w-full" orientation="vertical">
					{viewOptions.map((option) => {
						const isSelected = rightCalendarView === option.value
						return (
							<Button
								className={cn(
									'justify-start',
									isSelected &&
										'bg-primary text-primary-foreground hover:bg-primary/90'
								)}
								key={`right-${option.value}`}
								onClick={() => {
									onRightCalendarViewChange?.(option.value)
								}}
								size="sm"
								variant="outline"
							>
								<option.icon
									aria-hidden="true"
									className="opacity-70"
									size={16}
								/>
								{option.label}
							</Button>
						)
					})}
				</ButtonGroup>
			</div>
		</div>
	)
}

const SettingsPopover = memo(
	({
		i18n: i18nApi,
		isLocalized,
		suppressTooltip,
		onSettingsOpenChange,
		settingsOpen,
		activeTab,
		setActiveTab,
		isCalendarPage,
		currentCalendarView,
		handleCalendarViewChange,
		_isDualMode,
		viewMode,
		leftCalendarRef,
		rightCalendarRef,
		leftCalendarView,
		rightCalendarView,
		handleLeftCalendarViewChange,
		handleRightCalendarViewChange,
	}: {
		i18n: typeof i18n
		isLocalized: boolean
		suppressTooltip: boolean
		onSettingsOpenChange: (open: boolean) => void
		settingsOpen: boolean
		activeTab: string
		setActiveTab: (value: string) => void
		isCalendarPage: boolean
		currentCalendarView: string
		handleCalendarViewChange: (view: string) => void
		_isDualMode: boolean
		viewMode: 'freeRoam' | 'dual' | 'default'
		leftCalendarRef: RefObject<CalendarCoreRef | null> | null
		rightCalendarRef: RefObject<CalendarCoreRef | null> | null
		leftCalendarView: string
		rightCalendarView: string
		handleLeftCalendarViewChange: (view: string) => void
		handleRightCalendarViewChange: (view: string) => void
	}) => (
		<DockIcon>
			<Popover onOpenChange={onSettingsOpenChange} open={settingsOpen}>
				<Tooltip {...(settingsOpen || suppressTooltip ? { open: false } : {})}>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<StablePopoverButton
								aria-label={i18nApi.getMessage('settings', isLocalized)}
								className="size-9 rounded-full transition-colors duration-300 ease-out"
								variant={settingsOpen ? 'default' : 'ghost'}
							>
								<Settings
									className={cn(
										'size-4 transform transition-transform duration-300 ease-out',
										settingsOpen ? 'rotate-90' : 'rotate-0'
									)}
								/>
							</StablePopoverButton>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>
						<p>{i18nApi.getMessage('settings', isLocalized)}</p>
					</TooltipContent>
				</Tooltip>

				<PopoverContent
					align="center"
					className="w-auto max-w-[31.25rem] border-border/40 bg-background/70 backdrop-blur-md"
				>
					{_isDualMode && viewMode === 'dual' ? (
						<SettingsTabs
							activeTab={activeTab}
							currentCalendarView={currentCalendarView}
							customViewSelector={
								<DualCalendarViewSelector
									isLocalized={isLocalized}
									leftCalendarRef={leftCalendarRef || null}
									leftCalendarView={leftCalendarView}
									onLeftCalendarViewChange={handleLeftCalendarViewChange}
									onRightCalendarViewChange={handleRightCalendarViewChange}
									rightCalendarRef={rightCalendarRef || null}
									rightCalendarView={rightCalendarView}
								/>
							}
							isCalendarPage={isCalendarPage}
							isLocalized={isLocalized}
							onCalendarViewChange={handleCalendarViewChange}
							onTabChange={setActiveTab}
						/>
					) : (
						<SettingsTabs
							activeTab={activeTab}
							currentCalendarView={currentCalendarView}
							isCalendarPage={isCalendarPage}
							isLocalized={isLocalized}
							onCalendarViewChange={handleCalendarViewChange}
							onTabChange={setActiveTab}
						/>
					)}
				</PopoverContent>
			</Popover>
		</DockIcon>
	)
)

export function DockNavSimple({
	className = '',
	currentCalendarView = 'timeGridWeek',
	onCalendarViewChange,
	leftCalendarView = 'timeGridWeek',
	rightCalendarView = 'timeGridWeek',
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef,
	rightCalendarRef,
	isDualMode: _isDualMode = false,
	settingsOpen: controlledOpen,
	onSettingsOpenChange,
}: DockNavSimpleProps) {
	const pathname = usePathname()
	const { isLocalized } = useLanguageStore()
	const { freeRoam, showDualCalendar } = useSettingsStore()
	const { theme: _theme } = useTheme()
	const [mounted, setMounted] = useState(false)
	const [activeTab, setActiveTab] = useState('view')
	const [internalOpen, setInternalOpen] = useState(false)
	const isControlled = typeof controlledOpen === 'boolean'
	const settingsOpen = isControlled ? (controlledOpen as boolean) : internalOpen
	const [suppressTooltip, setSuppressTooltip] = useState(false)

	const isCalendarPage = pathname === '/'

	useEffect(() => {
		setMounted(true)
	}, [])

	const handleSettingsOpenChange = (next: boolean) => {
		if (isControlled) {
			onSettingsOpenChange?.(next)
		} else {
			setInternalOpen(next)
		}
		if (!next) {
			setSuppressTooltip(true)
			// Tooltip suppression timeout (300ms)
			const TOOLTIP_SUPPRESSION_TIMEOUT_MS = 300
			window.setTimeout(
				() => setSuppressTooltip(false),
				TOOLTIP_SUPPRESSION_TIMEOUT_MS
			)
		}
	}

	// Reset to view tab if vacation tab is selected but disabled
	let viewMode: 'freeRoam' | 'dual' | 'default'
	if (freeRoam) {
		viewMode = 'freeRoam'
	} else if (showDualCalendar) {
		viewMode = 'dual'
	} else {
		viewMode = 'default'
	}
	useEffect(() => {
		if (activeTab === 'vacation' && viewMode !== 'default') {
			setActiveTab('view')
		}
	}, [viewMode, activeTab])

	const handleCalendarViewChange = (view: string) => {
		onCalendarViewChange?.(view)
	}

	const handleLeftCalendarViewChange = (view: string) => {
		if (leftCalendarRef?.current) {
			const api = leftCalendarRef.current.getApi?.()
			if (api) {
				const doChange = () => {
					try {
						// Clear constraints before changing view to avoid plugin issues
						api.setOption('validRange', undefined)
						api.setOption('eventConstraint', undefined)
						api.setOption('selectConstraint', undefined)
					} catch {
						// Silently ignore errors when clearing calendar options (API may be unavailable)
					}

					try {
						api.changeView(view)
					} catch {
						// Silently ignore errors when changing calendar view (API may be unavailable)
					}

					// Reapply constraints only for non-multimonth views
					try {
						const lower = (view || '').toLowerCase()
						const isMultiMonth = lower === 'multimonthyear'
						if (!isMultiMonth) {
							api.setOption(
								'validRange',
								freeRoam ? undefined : getValidRange(freeRoam)
							)
							if (lower.includes('timegrid')) {
								api.setOption(
									'eventConstraint',
									freeRoam ? undefined : 'businessHours'
								)
								api.setOption(
									'selectConstraint',
									freeRoam ? undefined : 'businessHours'
								)
							}
						}
						// let the layout settle
						requestAnimationFrame(() => {
							try {
								api.updateSize?.()
							} catch {
								// Silently ignore errors when updating calendar size (API may be unavailable)
							}
						})
					} catch {
						// Silently ignore errors when applying calendar constraints (API may be unavailable)
					}
				}

				// If view is not ready yet, delay the change slightly
				if (
					api?.view &&
					(api as unknown as { view: { type?: string } }).view?.type
				) {
					doChange()
				} else {
					// Delay to allow calendar API to initialize (50ms)
					const CALENDAR_INIT_DELAY_MS = 50
					setTimeout(doChange, CALENDAR_INIT_DELAY_MS)
				}
			}
		}
		onLeftCalendarViewChange?.(view)
	}

	const handleRightCalendarViewChange = (view: string) => {
		if (rightCalendarRef?.current) {
			const api = rightCalendarRef.current.getApi?.()
			if (api) {
				const doChange = () => {
					try {
						api.setOption('validRange', undefined)
						api.setOption('eventConstraint', undefined)
						api.setOption('selectConstraint', undefined)
					} catch {
						// Silently ignore errors when clearing calendar options (API may be unavailable)
					}

					try {
						api.changeView(view)
					} catch {
						// Silently ignore errors when changing calendar view (API may be unavailable)
					}

					try {
						const lower = (view || '').toLowerCase()
						const isMultiMonth = lower === 'multimonthyear'
						if (!isMultiMonth) {
							api.setOption(
								'validRange',
								freeRoam ? undefined : getValidRange(freeRoam)
							)
							if (lower.includes('timegrid')) {
								api.setOption(
									'eventConstraint',
									freeRoam ? undefined : 'businessHours'
								)
								api.setOption(
									'selectConstraint',
									freeRoam ? undefined : 'businessHours'
								)
							}
						}
						requestAnimationFrame(() => {
							try {
								api.updateSize?.()
							} catch {
								// Silently ignore errors when updating calendar size (API may be unavailable)
							}
						})
					} catch {
						// Silently ignore errors when applying calendar constraints (API may be unavailable)
					}
				}

				if (
					api?.view &&
					(api as unknown as { view: { type?: string } }).view?.type
				) {
					doChange()
				} else {
					// Delay to allow calendar API to initialize (50ms)
					const CALENDAR_INIT_DELAY_MS = 50
					setTimeout(doChange, CALENDAR_INIT_DELAY_MS)
				}
			}
		}
		onRightCalendarViewChange?.(view)
	}

	const isActive = (href: string) => {
		if (href === '/' && pathname === '/') {
			return true
		}
		if (href !== '/' && pathname.startsWith(href)) {
			return true
		}
		return false
	}

	if (!mounted) {
		return null
	}

	return (
		<TooltipProvider>
			<Dock
				className={cn('h-auto min-h-[2.25rem]', className)}
				direction="middle"
			>
				<DockIcon>
					<Tooltip>
						<TooltipTrigger asChild>
							<PrefetchLink
								aria-label={i18n.getMessage('dashboard_title', isLocalized)}
								className={cn(
									buttonVariants({
										variant: isActive('/dashboard') ? 'default' : 'ghost',
										size: 'icon',
									}),
									'size-9 rounded-full transition-all duration-200',
									isActive('/dashboard') && 'shadow-lg'
								)}
								href="/dashboard"
							>
								<BarChart3 className="size-4" />
							</PrefetchLink>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage('dashboard_title', isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				{/* Separator */}
				<Separator className="h-full py-2" orientation="vertical" />

				{/* Settings Popover */}
				<SettingsPopover
					_isDualMode={_isDualMode}
					activeTab={activeTab}
					currentCalendarView={currentCalendarView}
					handleCalendarViewChange={handleCalendarViewChange}
					handleLeftCalendarViewChange={handleLeftCalendarViewChange}
					handleRightCalendarViewChange={handleRightCalendarViewChange}
					i18n={i18n}
					isCalendarPage={isCalendarPage}
					isLocalized={isLocalized}
					leftCalendarRef={leftCalendarRef || null}
					leftCalendarView={leftCalendarView}
					onSettingsOpenChange={handleSettingsOpenChange}
					rightCalendarRef={rightCalendarRef || null}
					rightCalendarView={rightCalendarView}
					setActiveTab={setActiveTab}
					settingsOpen={settingsOpen}
					suppressTooltip={suppressTooltip}
					viewMode={viewMode}
				/>
			</Dock>
		</TooltipProvider>
	)
}
