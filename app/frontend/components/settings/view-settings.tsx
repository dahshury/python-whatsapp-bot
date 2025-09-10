"use client";

import { Eye } from "lucide-react";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/lib/settings-context";
import { ViewModeToolbar } from "./view-mode-toolbar";

interface ViewSettingsProps {
	isLocalized?: boolean;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
}

export function ViewSettings({
	isLocalized = false,
	currentCalendarView = "multiMonthYear",
	activeView,
	onCalendarViewChange,
}: ViewSettingsProps) {
	useSettings();

	const viewOptions = getCalendarViewOptions(isLocalized);

	return (
		<div className="space-y-3 rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Eye className="h-4 w-4" />
					<span className="text-sm font-medium">
						{isLocalized ? "إعدادات العرض" : "View Settings"}
					</span>
				</div>

				<ViewModeToolbar />
			</div>

			<RadioGroup
				value={activeView || currentCalendarView}
				onValueChange={onCalendarViewChange ?? (() => {})}
				className="grid grid-cols-4 gap-2"
			>
				{viewOptions.map((option) => (
					<div key={option.value}>
						<RadioGroupItem
							value={option.value}
							id={`calendar-view-${option.value}`}
							className="peer sr-only"
						/>
						<Label
							htmlFor={`calendar-view-${option.value}`}
							className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
						>
							<option.icon className="mb-1 h-3.5 w-3.5" />
							{option.label}
						</Label>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
