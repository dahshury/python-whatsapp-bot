'use client'

import { i18n } from '@shared/libs/i18n'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import {
	addDays,
	addMonths,
	addYears,
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
import { useCallback, useMemo, useState } from 'react'
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
	showTabs?: boolean // If false, only show past presets without tabs
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
const NEXT_SEVEN_DAYS_LOOKAHEAD = 7
const NEXT_THIRTY_DAYS_LOOKAHEAD = 30
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
	showTabs = true,
}: InlineDateRangePickerProps) {
	const { resolvedTheme } = useTheme()
	const today = useMemo(() => new Date(), [])
	const [timeMode, setTimeMode] = useState<'past' | 'future'>('past')

	const cloneRange = useCallback(
		(from: Date, to?: Date): DateRange => ({
			from: new Date(from.getTime()),
			...(to ? { to: new Date(to.getTime()) } : {}),
		}),
		[]
	)

	const pastPresets = useMemo<RangePreset[]>(() => {
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
	}, [today, isLocalized, cloneRange])

	const futurePresets = useMemo<RangePreset[]>(() => {
		const resolvedToday = new Date(today)
		const tomorrow = addDays(resolvedToday, 1)
		const next7DaysEnd = addDays(resolvedToday, NEXT_SEVEN_DAYS_LOOKAHEAD)
		const next30DaysEnd = addDays(resolvedToday, NEXT_THIRTY_DAYS_LOOKAHEAD)
		const thisMonthEnd = endOfMonth(resolvedToday)
		const nextMonthStart = startOfMonth(addMonths(resolvedToday, 1))
		const nextMonthEnd = endOfMonth(addMonths(resolvedToday, 1))
		const thisYearEnd = endOfYear(resolvedToday)
		const nextYearStart = startOfYear(addYears(resolvedToday, 1))
		const nextYearEnd = endOfYear(addYears(resolvedToday, 1))

		return [
			{
				id: 'today-future',
				label: i18n.getMessage('date_preset_today', isLocalized) || 'Today',
				resolve: () => cloneRange(resolvedToday, resolvedToday),
			},
			{
				id: 'tomorrow',
				label:
					i18n.getMessage('date_preset_tomorrow', isLocalized) || 'Tomorrow',
				resolve: () => cloneRange(tomorrow, tomorrow),
			},
			{
				id: 'next-7-days',
				label:
					i18n.getMessage('date_preset_next_7_days', isLocalized) ||
					'Next 7 days',
				resolve: () => cloneRange(resolvedToday, next7DaysEnd),
			},
			{
				id: 'next-30-days',
				label:
					i18n.getMessage('date_preset_next_30_days', isLocalized) ||
					'Next 30 days',
				resolve: () => cloneRange(resolvedToday, next30DaysEnd),
			},
			{
				id: 'rest-of-month',
				label:
					i18n.getMessage('date_preset_rest_of_month', isLocalized) ||
					'Rest of month',
				resolve: () => cloneRange(resolvedToday, thisMonthEnd),
			},
			{
				id: 'next-month',
				label:
					i18n.getMessage('date_preset_next_month', isLocalized) ||
					'Next month',
				resolve: () => cloneRange(nextMonthStart, nextMonthEnd),
			},
			{
				id: 'rest-of-year',
				label:
					i18n.getMessage('date_preset_rest_of_year', isLocalized) ||
					'Rest of year',
				resolve: () => cloneRange(resolvedToday, thisYearEnd),
			},
			{
				id: 'next-year',
				label:
					i18n.getMessage('date_preset_next_year', isLocalized) || 'Next year',
				resolve: () => cloneRange(nextYearStart, nextYearEnd),
			},
		]
	}, [today, isLocalized, cloneRange])

	const presets: RangePreset[] = (() => {
		if (!showTabs) {
			return pastPresets
		}
		if (timeMode === 'past') {
			return pastPresets
		}
		return futurePresets
	})()

	// Determine which preset is currently selected (check both past and future)
	const currentPresetId = useMemo(() => {
		if (!value) {
			return null
		}
		const allPresets = [...pastPresets, ...futurePresets]
		for (const preset of allPresets) {
			const presetRange = preset.resolve()
			if (areRangesEqual(value, presetRange)) {
				return preset.id
			}
		}
		return null
	}, [value, pastPresets, futurePresets])

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
							<div className="flex flex-col gap-3 px-4 py-4">
								{showTabs && (
									<div className="flex items-start gap-2">
										<div className="flex flex-col gap-1">
											<span className="text-center font-medium text-muted-foreground text-xs">
												{i18n.getMessage('date_preset_presets', isLocalized) ||
													'Presets'}
											</span>
											<ButtonGroup orientation="vertical">
												<Button
													className="h-[18px] px-2 text-xs"
													onClick={() => setTimeMode('past')}
													size="sm"
													variant={timeMode === 'past' ? 'default' : 'outline'}
												>
													{i18n.getMessage('date_preset_past', isLocalized) ||
														'Past'}
												</Button>
												<Button
													className="h-[18px] px-2 text-xs"
													onClick={() => setTimeMode('future')}
													size="sm"
													variant={
														timeMode === 'future' ? 'default' : 'outline'
													}
												>
													{i18n.getMessage('date_preset_future', isLocalized) ||
														'Future'}
												</Button>
											</ButtonGroup>
										</div>
										<div className="flex flex-1 flex-col gap-2">
											<ButtonGroup>
												{presets
													.slice(0, FIRST_GROUP_PRESET_COUNT)
													.map((preset) => {
														const presetRange = preset.resolve()
														const isSelected =
															currentPresetId === preset.id ||
															areRangesEqual(value, presetRange)
														return (
															<Button
																key={preset.id}
																onClick={() =>
																	applyPreset(preset.id, presetRange)
																}
																size="sm"
																variant={isSelected ? 'default' : 'outline'}
															>
																{preset.label}
															</Button>
														)
													})}
											</ButtonGroup>
											<ButtonGroup>
												{presets
													.slice(FIRST_GROUP_PRESET_COUNT)
													.map((preset) => {
														const presetRange = preset.resolve()
														const isSelected =
															currentPresetId === preset.id ||
															areRangesEqual(value, presetRange)
														return (
															<Button
																key={preset.id}
																onClick={() =>
																	applyPreset(preset.id, presetRange)
																}
																size="sm"
																variant={isSelected ? 'default' : 'outline'}
															>
																{preset.label}
															</Button>
														)
													})}
											</ButtonGroup>
										</div>
									</div>
								)}
								{!showTabs && (
									<>
										<ButtonGroup>
											{presets
												.slice(0, FIRST_GROUP_PRESET_COUNT)
												.map((preset) => {
													const presetRange = preset.resolve()
													const isSelected =
														currentPresetId === preset.id ||
														areRangesEqual(value, presetRange)
													return (
														<Button
															key={preset.id}
															onClick={() =>
																applyPreset(preset.id, presetRange)
															}
															size="sm"
															variant={isSelected ? 'default' : 'outline'}
														>
															{preset.label}
														</Button>
													)
												})}
										</ButtonGroup>
										<ButtonGroup>
											{presets.slice(FIRST_GROUP_PRESET_COUNT).map((preset) => {
												const presetRange = preset.resolve()
												const isSelected =
													currentPresetId === preset.id ||
													areRangesEqual(value, presetRange)
												return (
													<Button
														key={preset.id}
														onClick={() => applyPreset(preset.id, presetRange)}
														size="sm"
														variant={isSelected ? 'default' : 'outline'}
													>
														{preset.label}
													</Button>
												)
											})}
										</ButtonGroup>
									</>
								)}
							</div>
						</ScrollArea>
					</div>
				</div>
			</div>
		</div>
	)
}
