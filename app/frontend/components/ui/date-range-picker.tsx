"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
	className?: string;
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
	placeholder?: string;
}

export function DatePickerWithRange({
	className,
	value,
	onChange,
	placeholder = "Pick a date range",
}: DatePickerWithRangeProps) {
	const [date, setDate] = React.useState<DateRange | undefined>(value);
	const today = new Date();
	const buttonId = React.useId();

	React.useEffect(() => {
		setDate(value);
	}, [value]);

	const handleSelect = (newDate: DateRange | undefined) => {
		setDate(newDate);
		onChange?.(newDate);
	};

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id={buttonId}
						variant={"outline"}
						className={cn(
							"w-[280px] justify-start text-left font-normal",
							!date && "text-muted-foreground",
						)}
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
							<span>{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						initialFocus
						mode="range"
						{...(date?.from ? { defaultMonth: date.from } : {})}
						{...(date ? { selected: date } : {})}
						onSelect={handleSelect}
						numberOfMonths={2}
						disabled={(date) => date > today}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
