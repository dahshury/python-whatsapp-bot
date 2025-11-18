'use client'

import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
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
import { CalendarIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

type DateRangeWithPresetsProps = {
	className?: string
	value?: DateRange
	onChange?: (range: DateRange | undefined) => void
}

export function DateRangeWithPresets({
	className,
	value,
	onChange,
}: DateRangeWithPresetsProps) {
	const today = useMemo(() => new Date(), [])

	// Date range preset constants
	const DAYS_IN_WEEK = 7
	const DAYS_IN_MONTH = 30

	const yesterday = useMemo(
		() => ({ from: subDays(today, 1), to: subDays(today, 1) }),
		[today]
	)
	const last7Days = useMemo(
		() => ({ from: subDays(today, DAYS_IN_WEEK - 1), to: today }),
		[today]
	)
	const last30Days = useMemo(
		() => ({ from: subDays(today, DAYS_IN_MONTH - 1), to: today }),
		[today]
	)
	const monthToDate = useMemo(
		() => ({ from: startOfMonth(today), to: today }),
		[today]
	)
	const lastMonth = useMemo(
		() => ({
			from: startOfMonth(subMonths(today, 1)),
			to: endOfMonth(subMonths(today, 1)),
		}),
		[today]
	)
	const yearToDate = useMemo(
		() => ({ from: startOfYear(today), to: today }),
		[today]
	)
	const lastYear = useMemo(
		() => ({
			from: startOfYear(subYears(today, 1)),
			to: endOfYear(subYears(today, 1)),
		}),
		[today]
	)

	const initial = value ?? last7Days
	const [date, setDate] = useState<DateRange | undefined>(initial)
	const [month, setMonth] = useState<Date>(initial?.to ?? today)

	useEffect(() => {
		if (value) {
			setDate(value)
			if (value.to) {
				setMonth(value.to)
			}
		}
	}, [value])

	const handleSelect = (newDate: DateRange | undefined) => {
		setDate(newDate)
		onChange?.(newDate)
	}

	const applyPreset = (range: DateRange) => {
		setDate(range)
		setMonth(range.to ?? today)
		onChange?.(range)
	}

	return (
		<div className={cn('grid gap-2', className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						aria-label="Open date range filter"
						className={cn(
							'w-[17.5rem] justify-start text-left font-normal',
							!date && 'text-muted-foreground'
						)}
						variant="outline"
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y')} -{' '}
									{format(date.to, 'LLL dd, y')}
								</>
							) : (
								format(date.from, 'LLL dd, y')
							)
						) : (
							<span>Select date range</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<div className="rounded-md border">
						<div className="flex max-sm:flex-col">
							<div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-32">
								<div className="h-full sm:border-e">
									<div className="flex flex-col px-2">
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset({ from: today, to: today })}
											size="sm"
											variant="ghost"
										>
											Today
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(yesterday)}
											size="sm"
											variant="ghost"
										>
											Yesterday
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(last7Days)}
											size="sm"
											variant="ghost"
										>
											Last 7 days
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(last30Days)}
											size="sm"
											variant="ghost"
										>
											Last 30 days
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(monthToDate)}
											size="sm"
											variant="ghost"
										>
											Month to date
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(lastMonth)}
											size="sm"
											variant="ghost"
										>
											Last month
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(yearToDate)}
											size="sm"
											variant="ghost"
										>
											Year to date
										</Button>
										<Button
											className="w-full justify-start"
											onClick={() => applyPreset(lastYear)}
											size="sm"
											variant="ghost"
										>
											Last year
										</Button>
									</div>
								</div>
							</div>
							<Calendar
								className="p-2"
								disabled={(d) => d > today}
								mode="range"
								month={month}
								onMonthChange={setMonth}
								onSelect={handleSelect}
								selected={date}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}
