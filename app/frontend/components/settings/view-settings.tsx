"use client";

import { Eye } from "lucide-react";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types/navigation";

interface ViewSettingsProps {
	isLocalized?: boolean;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
}

const VIEW_MODES: ViewMode[] = [
	{ value: "default", label: "Default", labelRTL: "افتراضي" },
	{ value: "freeRoam", label: "Free", labelRTL: "حر" },
	{ value: "dual", label: "Dual", labelRTL: "مزدوج" },
];

export function ViewSettings({
	isLocalized = false,
	currentCalendarView = "multiMonthYear",
	activeView,
	onCalendarViewChange,
}: ViewSettingsProps) {
	const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
		useSettings();

	const viewMode = freeRoam
		? "freeRoam"
		: showDualCalendar
			? "dual"
			: "default";
	const viewOptions = getCalendarViewOptions(isLocalized);

	const handleViewModeChange = (value: ViewMode["value"]) => {
		const isFreeRoam = value === "freeRoam";
		const isDual = value === "dual";

		setFreeRoam(isFreeRoam);
		setShowDualCalendar(isDual);

		const selectedMode = VIEW_MODES.find((m) => m.value === value);
		const modeLabel = isLocalized
			? selectedMode?.labelRTL ?? value
			: selectedMode?.label ?? value;

		toastService.success(
			isLocalized
				? `تم تغيير وضع العرض إلى ${modeLabel}`
				: `View mode changed to ${modeLabel}`,
		);
	};

	return (
		<div className="space-y-3 rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Eye className="h-4 w-4" />
					<span className="text-sm font-medium">
						{isLocalized ? "إعدادات العرض" : "View Settings"}
					</span>
				</div>

				<div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
					{VIEW_MODES.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => handleViewModeChange(mode.value)}
							className={cn(
								"px-2 py-1 text-xs rounded transition-colors",
								viewMode === mode.value
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{isLocalized ? mode.labelRTL : mode.label}
						</button>
					))}
				</div>
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
