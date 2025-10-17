"use client";

import { cn } from "@shared/libs/utils";
import { Label } from "@ui/label";
import { RadioGroup, RadioGroupItem } from "@ui/radio-group";
import type { ComponentType } from "react";
import { useId } from "react";

export type RadioCardItem = {
	value: string;
	label: string;
	Icon?: ComponentType<{
		size?: number;
		className?: string;
		"aria-hidden"?: boolean;
	}>;
};

export type RadioCardGroupProps = {
	items: RadioCardItem[];
	defaultValue?: string;
	className?: string;
};

export function RadioCardGroup({
	items,
	defaultValue,
	className,
}: RadioCardGroupProps) {
	const id = useId();
	return (
		<RadioGroup
			className={cn("grid gap-3", className)}
			{...(defaultValue !== undefined ? { defaultValue } : {})}
		>
			{items.map((item) => (
				<div
					className="relative flex flex-col gap-4 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50"
					key={`${id}-${item.value}`}
				>
					<div className="flex justify-between gap-2">
						<RadioGroupItem
							className="order-1 after:absolute after:inset-0"
							id={`${id}-${item.value}`}
							value={item.value}
						/>
						{item.Icon ? (
							<item.Icon aria-hidden={true} className="opacity-60" size={16} />
						) : null}
					</div>
					<Label htmlFor={`${id}-${item.value}`}>{item.label}</Label>
				</div>
			))}
		</RadioGroup>
	);
}
