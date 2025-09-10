"use client";

import { Plane, Settings2, View } from "lucide-react";
import * as React from "react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";
import { VacationPeriods } from "@/components/vacation-periods";
import { useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./general-settings";
import { ThemeSelector } from "./theme-selector";
import { ViewModeToolbar } from "./view-mode-toolbar";
import { ViewSettings } from "./view-settings";

interface SettingsTabsProps {
	isLocalized?: boolean;
	activeTab?: string;
	onTabChange?: (value: string) => void;
	currentCalendarView?: string;
	activeView?: string;
	onCalendarViewChange?: (view: string) => void;
	customViewSelector?: React.ReactElement;
	isCalendarPage?: boolean;
}

// View mode selection is handled by ViewModeToolbar

export function SettingsTabs({
	isLocalized = false,
	activeTab = "view",
	onTabChange,
	currentCalendarView,
	activeView,
	onCalendarViewChange,
	customViewSelector,
	isCalendarPage = true,
}: SettingsTabsProps) {
	useSettings();
	// View mode change logic lives in ViewModeToolbar

	// Removed auto-switching tabs when not on calendar page to avoid update loops.

	// Determine which tabs to show based on page
	const showViewTab = isCalendarPage;
	const showVacationTab = isCalendarPage;

	// Ensure active tab is valid when some tabs are hidden (e.g., dashboard page)
	const defaultTab = showViewTab ? "view" : "general";
	const computedActiveTab = React.useMemo(() => {
		const allowed = ["general"] as string[];
		if (showViewTab) allowed.push("view");
		if (showVacationTab) allowed.push("vacation");
		return allowed.includes(activeTab) ? activeTab : defaultTab;
	}, [activeTab, showViewTab, showVacationTab, defaultTab]);

	return (
		<Tabs value={computedActiveTab} onValueChange={onTabChange ?? (() => {})}>
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
						{isLocalized ? "العرض" : "View"}
					</TabsTrigger>
				)}
				<TabsTrigger value="general">
					<Settings2 className="h-4 w-4 mr-2" />
					{isLocalized ? "عام" : "General"}
				</TabsTrigger>
				{showVacationTab && (
					<TabsTrigger value="vacation" className="w-full relative">
						<Plane className="h-4 w-4 mr-2" />
						{isLocalized ? "الإجازة" : "Vacation"}
					</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="general" className="pt-4 space-y-4">
				<GeneralSettings isLocalized={isLocalized} />
				<ThemeSelector isLocalized={isLocalized} />
			</TabsContent>

			{showViewTab && (
				<TabsContent value="view" className="pt-4 space-y-4">
					{customViewSelector ? (
						<div className="space-y-3 rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<View className="h-4 w-4" />
									<span className="text-sm font-medium">
										{isLocalized ? "إعدادات العرض" : "View Settings"}
									</span>
								</div>

								<ViewModeToolbar />
							</div>

							{customViewSelector}
						</div>
					) : (
						<ViewSettings
							isLocalized={isLocalized}
							{...(currentCalendarView ? { currentCalendarView } : {})}
							{...(activeView ? { activeView } : {})}
							{...(onCalendarViewChange ? { onCalendarViewChange } : {})}
						/>
					)}
				</TabsContent>
			)}

			{showVacationTab && (
				<TabsContent value="vacation" className="pt-4">
					<div className="space-y-4">
						<div className="rounded-lg border p-3 bg-background/40 backdrop-blur-sm">
							{computedActiveTab === "vacation" && <VacationPeriods />}
						</div>
					</div>
				</TabsContent>
			)}
		</Tabs>
	);
}
