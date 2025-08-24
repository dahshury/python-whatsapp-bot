"use client";

import { Plane, Settings2, View } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VacationPeriods } from "@/components/vacation-periods";
import { useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types/navigation";
import { GeneralSettings } from "./general-settings";
import { ThemeSelector } from "./theme-selector";
import { ViewSettings } from "./view-settings";

interface SettingsTabsProps {
	isRTL?: boolean;
	activeTab?: string;
	onTabChange?: (value: string) => void;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	customViewSelector?: React.ReactElement;
	isCalendarPage?: boolean;
}

const VIEW_MODES: ViewMode[] = [
	{ value: "default", label: "Default", labelRTL: "افتراضي" },
	{ value: "freeRoam", label: "Free", labelRTL: "حر" },
	{ value: "dual", label: "Dual", labelRTL: "مزدوج" },
];

export function SettingsTabs({
	isRTL = false,
	activeTab = "view",
	onTabChange,
	currentCalendarView,
	activeView,
	onCalendarViewChange,
	customViewSelector,
	isCalendarPage = true,
}: SettingsTabsProps) {
	const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
		useSettings();
	const viewMode = freeRoam
		? "freeRoam"
		: showDualCalendar
			? "dual"
			: "default";

	const handleViewModeChange = (value: ViewMode["value"]) => {
		const isFreeRoam = value === "freeRoam";
		const isDual = value === "dual";

		setFreeRoam(isFreeRoam);
		setShowDualCalendar(isDual);

		toast(
			isRTL
				? `تم تغيير وضع العرض إلى ${value}`
				: `View mode changed to ${value}`,
		);
	};

	React.useEffect(() => {
		if (
			activeTab === "vacation" &&
			(viewMode !== "default" || !isCalendarPage)
		) {
			onTabChange?.("general");
		}
		if (activeTab === "view" && !isCalendarPage) {
			onTabChange?.("general");
		}
	}, [viewMode, activeTab, onTabChange, isCalendarPage]);

	// Determine which tabs to show based on page
	const showViewTab = isCalendarPage;
	const showVacationTab = isCalendarPage && viewMode === "default";

	return (
		<Tabs value={activeTab} onValueChange={onTabChange}>
			<TabsList
				className={cn(
					"grid w-full bg-muted/40 backdrop-blur-sm",
					showViewTab && showVacationTab
						? "grid-cols-3"
						: showViewTab
							? "grid-cols-2"
							: "grid-cols-1",
				)}
			>
				{showViewTab && (
					<TabsTrigger value="view">
						<View className="h-4 w-4 mr-2" />
						{isRTL ? "العرض" : "View"}
					</TabsTrigger>
				)}
				<TabsTrigger value="general">
					<Settings2 className="h-4 w-4 mr-2" />
					{isRTL ? "عام" : "General"}
				</TabsTrigger>
				{showVacationTab && (
					<TabsTrigger value="vacation" className="w-full relative">
						<Plane className="h-4 w-4 mr-2" />
						{isRTL ? "الإجازة" : "Vacation"}
					</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="general" className="pt-4 space-y-4">
				<GeneralSettings isRTL={isRTL} />
				<ThemeSelector isRTL={isRTL} />
			</TabsContent>

			{showViewTab && (
				<TabsContent value="view" className="pt-4 space-y-4">
					{customViewSelector ? (
						<div className="space-y-3 rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<View className="h-4 w-4" />
									<span className="text-sm font-medium">
										{isRTL ? "إعدادات العرض" : "View Settings"}
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
											{isRTL ? mode.labelRTL : mode.label}
										</button>
									))}
								</div>
							</div>

							{customViewSelector}
						</div>
					) : (
						<ViewSettings
							isRTL={isRTL}
							currentCalendarView={currentCalendarView}
							activeView={activeView}
							onCalendarViewChange={onCalendarViewChange}
						/>
					)}
				</TabsContent>
			)}

			{showVacationTab && (
				<TabsContent value="vacation" className="pt-4">
					<div className="space-y-4">
						<div className="rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
							{activeTab === "vacation" && <VacationPeriods />}
						</div>
					</div>
				</TabsContent>
			)}
		</Tabs>
	);
}
