'use client'

import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import {
	endOfMonth,
	endOfYear,
	format,
	startOfMonth,
	startOfYear,
	subDays,
	subMonths,
	subYears,
} from 'date-fns'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { DateRange } from 'react-day-picker'
import {
	animateWidget,
	findOrQueryWidget,
	observeWidgetCreation,
} from '@/shared/libs/data-grid/components/services/tempus-dominus.dom'
import { logger } from '@/shared/libs/logger'

type TempusModule = typeof import('@eonasdan/tempus-dominus')

type TempusDominusInstance = {
	show?: () => void
	hide?: () => void
	toggle?: () => void
	updateOptions?: (opts: Record<string, unknown>) => void
	dispose?: () => void
	subscribe?: (
		event: unknown,
		handler: (e: unknown) => void
	) => { unsubscribe?: () => void }
	dates?: {
		picked?: Array<{ valueOf: () => number } | Date>
		setValue?: (value: unknown | null, index?: number) => void
		clear?: () => void
	}
}

type TempusRuntime = {
	instance: TempusDominusInstance | null
	DateTime: (new (date?: Date) => { valueOf: () => number }) | null
	events: Record<string, unknown> | null
	unsubscribers: Array<() => void>
	disconnectObserver: (() => void) | null
}

type TempusPreset = {
	id: string
	label: string
	resolve: () => DateRange
}

type TempusDominusDateRangePickerProps = {
	value?: DateRange
	onRangeChangeAction?: (range: DateRange | undefined) => void
	className?: string
	children?: React.ReactNode
}

const RANGE_DISPLAY_FORMAT = 'LLL dd, y'
const RANGE_SEPARATOR_DISPLAY = ' – '
const MULTIPLE_DATES_SEPARATOR = '; '
const CHANGE_HIDE_DELAY_MS = 180
const DEFAULT_LOCALE = 'en-GB'
const DAY_OFFSET_YESTERDAY = 1
const LAST_SEVEN_DAYS_LOOKBACK = 6
const LAST_THIRTY_DAYS_LOOKBACK = 29

const INITIAL_RUNTIME: TempusRuntime = {
	instance: null,
	DateTime: null,
	events: null,
	unsubscribers: [],
	disconnectObserver: null,
}

const computeRangeKey = (range?: DateRange | null): string => {
	if (!range) {
		return 'range::empty'
	}
	const { from, to } = range
	if (from || to) {
		const fromKey = from?.getTime() ?? -1
		const toKey = to?.getTime() ?? -1
		return `range::${fromKey}|${toKey}`
	}
	return 'range::empty'
}

const formatRangeLabel = (range?: DateRange | null): string => {
	if (!range) {
		return 'Select date range'
	}
	const { from, to } = range
	if (from && to) {
		return `${format(from, RANGE_DISPLAY_FORMAT)}${RANGE_SEPARATOR_DISPLAY}${format(to, RANGE_DISPLAY_FORMAT)}`
	}
	if (from) {
		return format(from, RANGE_DISPLAY_FORMAT)
	}
	if (to) {
		return format(to, RANGE_DISPLAY_FORMAT)
	}
	return 'Select date range'
}

const toDate = (value: unknown): Date | undefined => {
	if (!value) {
		return
	}
	try {
		if (value instanceof Date) {
			const clone = new Date(value.getTime())
			return Number.isNaN(clone.getTime()) ? undefined : clone
		}
		if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
			const dt = (value as { toDate: () => Date }).toDate()
			if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
				return new Date(dt.getTime())
			}
		}
		if (typeof (value as { valueOf?: () => number }).valueOf === 'function') {
			const numeric = (value as { valueOf: () => number }).valueOf()
			if (Number.isFinite(numeric)) {
				const dt = new Date(numeric)
				return Number.isNaN(dt.getTime()) ? undefined : dt
			}
		}
	} catch (error) {
		logger.error('TempusDominusDateRangePicker failed to normalize date', error)
	}
	return
}

const buildRangeOptions = (theme: 'dark' | 'light') => {
	const options: Record<string, unknown> = {
		allowInputToggle: false,
		dateRange: true,
		multipleDatesSeparator: MULTIPLE_DATES_SEPARATOR,
		useCurrent: false,
		keepInvalid: false,
		debug: false,
		promptTimeOnDateChange: false,
		promptTimeOnDateChangeTransitionDelay: 200,
		restrictions: {},
		stepping: 1,
		display: {
			icons: {
				type: 'icons',
				time: 'fa-solid fa-clock',
				date: 'fa-solid fa-calendar',
				up: 'fa-solid fa-arrow-up',
				down: 'fa-solid fa-arrow-down',
				previous: 'fa-solid fa-chevron-left',
				next: 'fa-solid fa-chevron-right',
				today: 'fa-solid fa-calendar-check',
				clear: 'fa-solid fa-trash',
				close: 'fa-solid fa-xmark',
			},
			calendarWeeks: false,
			inline: false,
			keepOpen: true,
			keyboardNavigation: true,
			sideBySide: false,
			toolbarPlacement: 'bottom',
			viewMode: 'calendar',
			buttons: {
				today: true,
				clear: true,
				close: true,
			},
			components: {
				calendar: true,
				date: true,
				month: true,
				year: true,
				decades: true,
				clock: false,
				hours: false,
				minutes: false,
				seconds: false,
				useTwentyfourHour: undefined,
			},
			theme,
		},
		localization: {
			locale: DEFAULT_LOCALE,
			format: 'dd/MM/yyyy',
			hourCycle: 'h23',
		},
	}

	if (typeof document !== 'undefined') {
		options.container = document.body
	}

	return options
}

const syncWidgetTheme = (
	instance: TempusDominusInstance | null,
	theme: 'dark' | 'light'
) => {
	if (!instance) {
		return
	}
	try {
		const widget = findOrQueryWidget(instance)
		if (!widget) {
			return
		}
		widget.classList.remove('lightTheme', 'darkTheme')
		widget.classList.add(theme === 'dark' ? 'darkTheme' : 'lightTheme')
		widget.setAttribute('data-theme', theme)
	} catch (error) {
		logger.error(
			'TempusDominusDateRangePicker failed to sync widget theme',
			error
		)
	}
}

export function TempusDominusDateRangePicker({
	value,
	onRangeChangeAction,
	className,
	children,
}: TempusDominusDateRangePickerProps) {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const runtimeRef = useRef<TempusRuntime>({ ...INITIAL_RUNTIME })
	const onRangeChangeRef =
		useRef<typeof onRangeChangeAction>(onRangeChangeAction)
	const isSyncingRef = useRef(false)
	const lastRangeKeyRef = useRef<string>(computeRangeKey(value))
	const { resolvedTheme } = useTheme()

	const today = useMemo(() => new Date(), [])

	const presets = useMemo<TempusPreset[]>(() => {
		const resolvedToday = new Date(today)
		const yesterday = subDays(resolvedToday, DAY_OFFSET_YESTERDAY)
		const last7DaysStart = subDays(resolvedToday, LAST_SEVEN_DAYS_LOOKBACK)
		const last30DaysStart = subDays(resolvedToday, LAST_THIRTY_DAYS_LOOKBACK)
		const thisMonthStart = startOfMonth(resolvedToday)
		const lastMonthStart = startOfMonth(subMonths(resolvedToday, 1))
		const lastMonthEnd = endOfMonth(subMonths(resolvedToday, 1))
		const thisYearStart = startOfYear(resolvedToday)
		const lastYearStart = startOfYear(subYears(resolvedToday, 1))
		const lastYearEnd = endOfYear(subYears(resolvedToday, 1))

		const cloneRange = (from: Date, to?: Date): DateRange => ({
			from: new Date(from.getTime()),
			...(to ? { to: new Date(to.getTime()) } : {}),
		})

		return [
			{
				id: 'today',
				label: 'Today',
				resolve: () => cloneRange(resolvedToday, resolvedToday),
			},
			{
				id: 'yesterday',
				label: 'Yesterday',
				resolve: () => cloneRange(yesterday, yesterday),
			},
			{
				id: 'last-7-days',
				label: 'Last 7 days',
				resolve: () => cloneRange(last7DaysStart, resolvedToday),
			},
			{
				id: 'last-30-days',
				label: 'Last 30 days',
				resolve: () => cloneRange(last30DaysStart, resolvedToday),
			},
			{
				id: 'month-to-date',
				label: 'Month to date',
				resolve: () => cloneRange(thisMonthStart, resolvedToday),
			},
			{
				id: 'last-month',
				label: 'Last month',
				resolve: () => cloneRange(lastMonthStart, lastMonthEnd),
			},
			{
				id: 'year-to-date',
				label: 'Year to date',
				resolve: () => cloneRange(thisYearStart, resolvedToday),
			},
			{
				id: 'last-year',
				label: 'Last year',
				resolve: () => cloneRange(lastYearStart, lastYearEnd),
			},
		]
	}, [today])

	const rangeLabel = useMemo(() => formatRangeLabel(value), [value])

	const syncRangeToPicker = useCallback((range?: DateRange | null) => {
		const runtime = runtimeRef.current
		const instance = runtime.instance
		const DateTimeCtor = runtime.DateTime
		const setValue = instance?.dates?.setValue?.bind(instance?.dates)
		if (!(instance && DateTimeCtor && typeof setValue === 'function')) {
			return
		}
		const toDateTime = (date: Date) => new DateTimeCtor(date)
		try {
			isSyncingRef.current = true
			setValue(null)
			const hasFrom = Boolean(range?.from)
			const hasTo = Boolean(range?.to)
			if (!(hasFrom || hasTo)) {
				return
			}
			if (hasFrom && range?.from) {
				setValue(toDateTime(range.from), 0)
			}
			if (hasTo && range?.to) {
				const index = hasFrom ? 1 : 0
				setValue(toDateTime(range.to), index)
			}
		} catch (error) {
			logger.error('TempusDominusDateRangePicker failed to sync range', error)
		} finally {
			window.setTimeout(() => {
				isSyncingRef.current = false
			}, 0)
		}
	}, [])

	const teardownInstance = useCallback(() => {
		const runtime = runtimeRef.current
		for (const unsubscribe of runtime.unsubscribers) {
			try {
				unsubscribe()
			} catch (error) {
				logger.error(
					'TempusDominusDateRangePicker failed to unsubscribe',
					error
				)
			}
		}
		runtime.unsubscribers = []
		try {
			runtime.disconnectObserver?.()
		} catch (error) {
			logger.error(
				'TempusDominusDateRangePicker failed to disconnect observer',
				error
			)
		}
		runtime.disconnectObserver = null
		try {
			runtime.instance?.dispose?.()
		} catch (error) {
			logger.error(
				'TempusDominusDateRangePicker failed to dispose Tempus instance',
				error
			)
		}
		runtime.instance = null
		runtime.DateTime = null
		runtime.events = null
		isSyncingRef.current = false
	}, [])

	const handlePickerChange = useCallback(
		(event: unknown) => {
			if (isSyncingRef.current) {
				return
			}
			const runtime = runtimeRef.current
			const instance = runtime.instance
			if (!instance) {
				return
			}

			const isClear = Boolean((event as { isClear?: boolean })?.isClear)
			const picked = Array.isArray(instance.dates?.picked)
				? (instance.dates?.picked as Array<{ valueOf: () => number } | Date>)
				: []

			if (isClear || picked.length === 0) {
				const key = computeRangeKey(undefined)
				if (key !== lastRangeKeyRef.current) {
					lastRangeKeyRef.current = key
					onRangeChangeRef.current?.(undefined)
				}
				syncRangeToPicker(undefined)
				return
			}

			const normalized = picked
				.map((item) => toDate(item))
				.filter((date): date is Date => !!date)
				.sort((a, b) => a.getTime() - b.getTime())

			if (normalized.length === 0) {
				return
			}

			const start = normalized[0]
			const end = normalized.at(-1)
			if (!end) {
				return
			}
			const range: DateRange = end ? { from: start, to: end } : { from: start }
			const key = computeRangeKey(range)
			if (key === lastRangeKeyRef.current) {
				return
			}
			lastRangeKeyRef.current = key
			onRangeChangeRef.current?.(range)

			if (range.from && range.to) {
				window.setTimeout(() => {
					try {
						runtime.instance?.hide?.()
					} catch (error) {
						logger.error(
							'TempusDominusDateRangePicker failed to hide widget',
							error
						)
					}
				}, CHANGE_HIDE_DELAY_MS)
			}
		},
		[syncRangeToPicker]
	)

	const ensureInstance = useCallback(async () => {
		if (runtimeRef.current.instance || !inputRef.current) {
			return runtimeRef.current.instance
		}
		try {
			const module: TempusModule = await import('@eonasdan/tempus-dominus')
			const TempusDominusCtor = module.TempusDominus as unknown as new (
				element: HTMLElement,
				opts: Record<string, unknown>
			) => TempusDominusInstance
			const themeName = resolvedTheme === 'dark' ? 'dark' : 'light'
			const options = buildRangeOptions(themeName)
			const runtime = runtimeRef.current
			const instance = new TempusDominusCtor(inputRef.current, options)
			runtime.instance = instance
			runtime.DateTime = module.DateTime as unknown as new (
				date?: Date
			) => { valueOf: () => number }
			const namespaceWithEvents =
				(module.Namespace as unknown as
					| { events?: Record<string, unknown> }
					| undefined) ?? undefined
			runtime.events = namespaceWithEvents?.events ?? null
			runtime.unsubscribers = []
			runtime.disconnectObserver = observeWidgetCreation((widget) => {
				syncWidgetTheme(instance, themeName)
				animateWidget(widget, 'show')
			})
			syncWidgetTheme(instance, themeName)

			const register = (eventKey: keyof NonNullable<typeof runtime.events>) => {
				const event = runtime.events?.[eventKey]
				if (!event || typeof instance.subscribe !== 'function') {
					return
				}
				try {
					const subscription = instance.subscribe(event, (payload: unknown) => {
						if (eventKey === 'show') {
							const widget = findOrQueryWidget(instance)
							if (widget) {
								animateWidget(widget, 'show')
							}
							return
						}
						if (eventKey === 'hide') {
							const widget = findOrQueryWidget(instance)
							if (widget) {
								animateWidget(widget, 'hide')
							}
							inputRef.current?.blur()
							return
						}
						if (eventKey === 'change') {
							handlePickerChange(payload)
						}
					})
					if (subscription?.unsubscribe) {
						runtime.unsubscribers.push(() => {
							try {
								subscription.unsubscribe?.()
							} catch (error) {
								logger.error(
									'TempusDominusDateRangePicker failed to unsubscribe from Tempus event',
									error
								)
							}
						})
					}
				} catch (error) {
					logger.error(
						'TempusDominusDateRangePicker failed to subscribe to event',
						error
					)
				}
			}

			register('show')
			register('hide')
			register('change')

			syncRangeToPicker(value)

			return instance
		} catch (error) {
			logger.error('TempusDominusDateRangePicker failed to initialize', error)
			return null
		}
	}, [handlePickerChange, resolvedTheme, syncRangeToPicker, value])

	const handleToggle = useCallback(async () => {
		const instance = await ensureInstance()
		try {
			instance?.toggle?.()
		} catch (error) {
			logger.error(
				'TempusDominusDateRangePicker failed to toggle widget',
				error
			)
		}
	}, [ensureInstance])

	const applyPreset = useCallback(
		async (range: DateRange | undefined) => {
			await ensureInstance()
			syncRangeToPicker(range)
			const key = computeRangeKey(range)
			lastRangeKeyRef.current = key
			onRangeChangeRef.current?.(range)
		},
		[ensureInstance, syncRangeToPicker]
	)

	useEffect(() => {
		onRangeChangeRef.current = onRangeChangeAction
	}, [onRangeChangeAction])

	useEffect(() => {
		const key = computeRangeKey(value)
		lastRangeKeyRef.current = key
		syncRangeToPicker(value)
	}, [syncRangeToPicker, value])

	useEffect(() => {
		const runtime = runtimeRef.current
		if (!runtime.instance) {
			return
		}
		const themeName = resolvedTheme === 'dark' ? 'dark' : 'light'
		try {
			runtime.instance.updateOptions?.({
				display: { theme: themeName },
			})
		} catch (error) {
			logger.error(
				'TempusDominusDateRangePicker failed to update widget options',
				error
			)
		}
		syncWidgetTheme(runtime.instance, themeName)
	}, [resolvedTheme])

	useEffect(
		() => () => {
			teardownInstance()
		},
		[teardownInstance]
	)

	return (
		<>
			<Button
				aria-label="Open date range picker"
				className={cn(
					'relative w-[17.5rem] justify-start text-left font-normal',
					className
				)}
				onClick={handleToggle}
				size="sm"
				type="button"
				variant="outline"
			>
				<input
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
					ref={inputRef}
					tabIndex={-1}
					type="text"
				/>
				{children}
				<CalendarIcon className="mr-2 h-4 w-4" />
				<span>{rangeLabel}</span>
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="Open date range presets"
						size="sm"
						type="button"
						variant="outline"
					>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44 p-1">
					{presets.map((preset) => (
						<DropdownMenuItem
							key={preset.id}
							onSelect={async (event) => {
								event.preventDefault()
								await applyPreset(preset.resolve())
							}}
						>
							{preset.label}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={async (event) => {
							event.preventDefault()
							await applyPreset(undefined)
						}}
					>
						Clear selection
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}
