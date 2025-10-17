"use client";

import {
	WheelPicker,
	type WheelPickerOption,
	WheelPickerWrapper,
} from "@ncdai/react-wheel-picker";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/shared/libs/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

const MIN_AGE_DEFAULT = 10;
const MAX_AGE_DEFAULT = 120;

type AgeWheelPickerProps = {
	value: number | null;
	onChange: (value: number | null) => void;
	min?: number;
	max?: number;
	className?: string;
};

const buildOptions = (min: number, max: number): WheelPickerOption[] => {
	const options: WheelPickerOption[] = [];
	for (let i = min; i <= max; i++) {
		options.push({
			label: String(i),
			value: String(i),
		});
	}
	return options;
};

export function AgeWheelPicker({
	value,
	onChange,
	min = MIN_AGE_DEFAULT,
	max = MAX_AGE_DEFAULT,
	className,
}: AgeWheelPickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [localValue, setLocalValue] = useState<string>(
		value != null ? String(value) : String(min)
	);

	const options = useMemo(() => buildOptions(min, max), [min, max]);

	const handleValueChange = useCallback((newValue: string) => {
		setLocalValue(newValue);
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				// Commit on close
				const parsed = Number(localValue);
				if (Number.isFinite(parsed)) {
					onChange(parsed);
				}
			}
			setIsOpen(open);
		},
		[localValue, onChange]
	);

	return (
		<Popover onOpenChange={handleOpenChange} open={isOpen}>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"text-left hover:bg-accent hover:text-accent-foreground",
						className
					)}
					type="button"
				>
					{value !== null ? `${value} years` : "Select age"}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="center"
				className="w-full max-w-sm p-4"
				side="bottom"
			>
				<div className="flex flex-col items-center gap-4">
					<h3 className="font-semibold text-base">Select Age</h3>
					<div className="w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-4">
						<WheelPickerWrapper className="w-full">
							<WheelPicker
								classNames={{
									optionItem: "text-muted-foreground text-base",
									highlightWrapper:
										"bg-background/80 text-foreground border border-border/50 rounded-md",
									highlightItem: "text-foreground font-semibold text-lg",
								}}
								onValueChange={handleValueChange}
								optionItemHeight={48}
								options={options}
								value={localValue}
								visibleCount={7}
							/>
						</WheelPickerWrapper>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
