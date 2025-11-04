'use client'

import { i18n } from '@shared/libs/i18n'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import {
	endOfMonth,
	endOfYear,
	isSameDay,
	startOfMonth,
	startOfYear,
	subDays,
	subMonths,
	subYears,
} from 'date-fns'
import { useTheme } from 'next-themes'
import { useCallback, useMemo } from 'react'
import DateObject from 'react-date-object'
import arabicCalendar from 'react-date-object/calendars/arabic'
import gregorianCalendar from 'react-date-object/calendars/gregorian'
import arabicAr from 'react-date-object/locales/arabic_ar'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import type { DateRange } from 'react-day-picker'
import { Calendar as DateRangeCalendar } from 'react-multi-date-picker'
import { logger } from '@/shared/libs/logger'
import { ButtonGroup } from '@/shared/ui/button-group'
import { ScrollArea } from '@/shared/ui/scroll-area'

import 'react-multi-date-picker/styles/colors/green.css'
import 'react-multi-date-picker/styles/backgrounds/bg-dark.css'
import 'react-multi-date-picker/styles/backgrounds/bg-gray.css'
import styles from './inline-date-range-picker.module.css'

type InlineDateRangePickerProps = {
	value?: DateRange
	onRangeChangeAction?: (range: DateRange | undefined) => void
	className?: string
	isLocalized?: boolean
}

type CalendarValue =
	| Date
	| Date[]
	| DateObject
	| DateObject[]
	| null
	| undefined

type RangePreset = {
	id: string
	label: string
	resolve: () => DateRange
}

const DAY_OFFSET_YESTERDAY = 1
const LAST_SEVEN_DAYS_LOOKBACK = 6
const LAST_THIRTY_DAYS_LOOKBACK = 29
const FIRST_GROUP_PRESET_COUNT = 5

const toDateObject = (input?: Date | null): DateObject | undefined => {
	if (!input) {
		return
	}
	try {
		return new DateObject(input)
	} catch (error) {
		logger.error('InlineDateRangePicker: failed to create DateObject', error)
		return
	}
}

const toCalendarValue = (
	range?: DateRange | null
): DateObject[] | undefined => {
	if (!range) {
		return
	}
	const values: DateObject[] = []
	const from = toDateObject(range.from ?? null)
	const to = toDateObject(range.to ?? null)
	if (from) {
		values.push(from)
	}
	if (to && (!from || to.valueOf() !== from.valueOf())) {
		values.push(to)
	}
	return values.length > 0 ? values : undefined
}

const normalizeCalendarValue = (
	value: CalendarValue
): DateRange | undefined => {
	if (!value) {
		return
	}
	const candidates = (Array.isArray(value) ? value : [value])
		.map((entry) => {
			if (entry instanceof DateObject) {
				return entry.toDate()
			}
			if (entry instanceof Date) {
				return new Date(entry.getTime())
			}
			return null
		})
		.filter(
			(date): date is Date =>
				date !== null && date instanceof Date && !Number.isNaN(date.getTime())
		)
		.sort((a, b) => a.getTime() - b.getTime())

	if (candidates.length === 0) {
		return
	}

	const from = candidates[0]
	if (!from) {
		return
	}
	const to = candidates.length > 1 ? candidates.at(-1) : undefined

	return {
		from,
		...(to ? { to } : {}),
	}
}

const areRangesEqual = (range1?: DateRange, range2?: DateRange): boolean => {
	if (!range1) {
		return !range2
	}

	if (!range2) {
		return false
	}

	if (!range1.from) {
		return false
	}

	if (!range2.from) {
		return false
	}

	const sameFrom = isSameDay(range1.from, range2.from)

	if (!range1.to) {
		return !range2.to && sameFrom
	}

	if (!range2.to) {
		return false
	}

	return sameFrom && isSameDay(range1.to, range2.to)
}

export function InlineDateRangePicker({
	value,
	onRangeChangeAction,
	className,
	isLocalized = false,
}: InlineDateRangePickerProps) {
	const { resolvedTheme } = useTheme()
	const today = useMemo(() => new Date(), [])

	const presets = useMemo<RangePreset[]>(() => {
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
				label: i18n.getMessage('date_preset_today', isLocalized) || 'Today',
				resolve: () => cloneRange(resolvedToday, resolvedToday),
			},
			{
				id: 'yesterday',
				label:
					i18n.getMessage('date_preset_yesterday', isLocalized) || 'Yesterday',
				resolve: () => cloneRange(yesterday, yesterday),
			},
			{
				id: 'last-7-days',
				label:
					i18n.getMessage('date_preset_last_7_days', isLocalized) ||
					'Last 7 days',
				resolve: () => cloneRange(last7DaysStart, resolvedToday),
			},
			{
				id: 'last-30-days',
				label:
					i18n.getMessage('date_preset_last_30_days', isLocalized) ||
					'Last 30 days',
				resolve: () => cloneRange(last30DaysStart, resolvedToday),
			},
			{
				id: 'month-to-date',
				label:
					i18n.getMessage('date_preset_month_to_date', isLocalized) ||
					'Month to date',
				resolve: () => cloneRange(thisMonthStart, resolvedToday),
			},
			{
				id: 'last-month',
				label:
					i18n.getMessage('date_preset_last_month', isLocalized) ||
					'Last month',
				resolve: () => cloneRange(lastMonthStart, lastMonthEnd),
			},
			{
				id: 'year-to-date',
				label:
					i18n.getMessage('date_preset_year_to_date', isLocalized) ||
					'Year to date',
				resolve: () => cloneRange(thisYearStart, resolvedToday),
			},
			{
				id: 'last-year',
				label:
					i18n.getMessage('date_preset_last_year', isLocalized) || 'Last year',
				resolve: () => cloneRange(lastYearStart, lastYearEnd),
			},
		]
	}, [today, isLocalized])

	// Determine which preset is currently selected
	const currentPresetId = useMemo(() => {
		if (!value) {
			return null
		}
		for (const preset of presets) {
			const presetRange = preset.resolve()
			if (areRangesEqual(value, presetRange)) {
				return preset.id
			}
		}
		return null
	}, [value, presets])

	const calendarValue = useMemo(() => toCalendarValue(value), [value])

	const handleCalendarChange = useCallback(
		(nextValue: CalendarValue) => {
			const normalized = normalizeCalendarValue(nextValue)
			onRangeChangeAction?.(normalized)
		},
		[onRangeChangeAction]
	)

	const applyPreset = useCallback(
		(_presetId: string | null, range?: DateRange | undefined) => {
			onRangeChangeAction?.(range)
		},
		[onRangeChangeAction]
	)

	const calendar = isLocalized ? arabicCalendar : gregorianCalendar
	const locale = isLocalized ? arabicAr : gregorianEn
	const direction = isLocalized ? 'rtl' : 'ltr'
	const isDark = resolvedTheme === 'dark'
	const calendarClassName = useMemo(
		() => cn(styles.calendar, isDark ? 'bg-dark' : 'bg-gray', 'green'),
		[isDark]
	)

	return (
		<div className={cn(styles.container, className)} dir={direction}>
			<div className={styles.contentWrapper}>
				<div className={styles.calendarWrapper}>
					<DateRangeCalendar
						calendar={calendar}
						className={calendarClassName}
						locale={locale}
						numberOfMonths={2}
						onChange={handleCalendarChange}
						range
						rangeHover
						shadow={false}
						value={calendarValue ?? []}
						weekStartDayIndex={0}
					/>
				</div>
				<div className={styles.presetsSidebar}>
					<div>
						<ScrollArea className={styles.presetsScrollArea}>
							<div className="flex flex-col items-center gap-3 px-4 py-4">
								<ButtonGroup>
									{presets.slice(0, FIRST_GROUP_PRESET_COUNT).map((preset) => (
										<Button
											key={preset.id}
											onClick={() => applyPreset(preset.id, preset.resolve())}
											size="sm"
											variant={
												currentPresetId === preset.id ? 'default' : 'outline'
											}
										>
											{preset.label}
										</Button>
									))}
								</ButtonGroup>
								<ButtonGroup>
									{presets.slice(FIRST_GROUP_PRESET_COUNT).map((preset) => (
										<Button
											key={preset.id}
											onClick={() => applyPreset(preset.id, preset.resolve())}
											size="sm"
											variant={
												currentPresetId === preset.id ? 'default' : 'outline'
											}
										>
											{preset.label}
										</Button>
									))}
								</ButtonGroup>
							</div>
						</ScrollArea>
					</div>
				</div>
			</div>
		</div>
	)
}
