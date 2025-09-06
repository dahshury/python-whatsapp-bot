"use client";

import React from "react";
import {
	endOfMonth,
	endOfYear,
	startOfMonth,
	startOfYear,
	subDays,
	subMonths,
	subYears,
} from "date-fns";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface DateRangeWithPresetsProps {
	className?: string;
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
}

export function DateRangeWithPresets({
	className,
	value,
	onChange,
}: DateRangeWithPresetsProps) {
	const today = React.useMemo(() => new Date(), []);

	const yesterday = React.useMemo(
		() => ({ from: subDays(today, 1), to: subDays(today, 1) }),
		[today],
	);
	const last7Days = React.useMemo(
		() => ({ from: subDays(today, 6), to: today }),
		[today],
	);
	const last30Days = React.useMemo(
		() => ({ from: subDays(today, 29), to: today }),
		[today],
	);
	const monthToDate = React.useMemo(
		() => ({ from: startOfMonth(today), to: today }),
		[today],
	);
	const lastMonth = React.useMemo(
		() => ({
			from: startOfMonth(subMonths(today, 1)),
			to: endOfMonth(subMonths(today, 1)),
		}),
		[today],
	);
	const yearToDate = React.useMemo(
		() => ({ from: startOfYear(today), to: today }),
		[today],
	);
	const lastYear = React.useMemo(
		() => ({
			from: startOfYear(subYears(today, 1)),
			to: endOfYear(subYears(today, 1)),
		}),
		[today],
	);

	const initial = value ?? last7Days;
	const [date, setDate] = React.useState<DateRange | undefined>(initial);
	const [month, setMonth] = React.useState<Date>(initial?.to ?? today);

	React.useEffect(() => {
		if (value) {
			setDate(value);
			if (value.to) setMonth(value.to);
		}
	}, [value]);

	const handleSelect = (newDate: DateRange | undefined) => {
		setDate(newDate);
		onChange?.(newDate);
	};

	const applyPreset = (range: DateRange) => {
		setDate(range);
		setMonth(range.to ?? today);
		onChange?.(range);
	};

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn(
							"w-[280px] justify-start text-left font-normal",
							!date && "text-muted-foreground",
						)}
						aria-label="Open date range filter"
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, "LLL dd, y")} -{" "}
									{format(date.to, "LLL dd, y")}
								</>
							) : (
								format(date.from, "LLL dd, y")
							)
						) : (
							<span>Select date range</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="rounded-md border">
						<div className="flex max-sm:flex-col">
							<div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-32">
								<div className="h-full sm:border-e">
									<div className="flex flex-col px-2">
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset({ from: today, to: today })}
										>
											Today
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(yesterday)}
										>
											Yesterday
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(last7Days)}
										>
											Last 7 days
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(last30Days)}
										>
											Last 30 days
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(monthToDate)}
										>
											Month to date
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(lastMonth)}
										>
											Last month
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(yearToDate)}
										>
											Year to date
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start"
											onClick={() => applyPreset(lastYear)}
										>
											Last year
										</Button>
									</div>
								</div>
							</div>
							<Calendar
								mode="range"
								selected={date}
								onSelect={handleSelect}
								month={month}
								onMonthChange={setMonth}
								className="p-2"
								disabled={(d) => d > today}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default DateRangeWithPresets;
