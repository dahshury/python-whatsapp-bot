"use client";

import { VacationPeriods } from "@features/settings/vacation-periods";
import { i18n } from "@shared/libs/i18n";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { Plane, Settings2, View } from "lucide-react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/animate-ui/components/radix/tabs";
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
	/**
	 * Optional override to control which tabs are visible. When provided,
	 * it takes precedence over isCalendarPage for determining visibility.
	 */
	allowedTabs?: ReadonlyArray<"view" | "general" | "vacation">;
	/** Hide the ViewModeToolbar (free roam / dual / default) controls. */
	hideViewModeToolbar?: boolean;
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
	allowedTabs,
	hideViewModeToolbar = false,
}: SettingsTabsProps) {
	useSettings();
	// View mode change logic lives in ViewModeToolbar

	// Removed auto-switching tabs when not on calendar page to avoid update loops.

	// Determine which tabs to show
	const showViewTab = Array.isArray(allowedTabs) ? allowedTabs.includes("view") : isCalendarPage;
	const showVacationTab = Array.isArray(allowedTabs) ? allowedTabs.includes("vacation") : isCalendarPage;
	const showGeneralTab = Array.isArray(allowedTabs) ? allowedTabs.includes("general") : true;

	// Ensure active tab is valid when some tabs are hidden (e.g., dashboard page)
	const defaultTab = showViewTab ? "view" : showGeneralTab ? "general" : showVacationTab ? "vacation" : "view";
	const computedActiveTab = React.useMemo(() => {
		const allowed = [] as string[];
		if (showGeneralTab) allowed.push("general");
		if (showViewTab) allowed.push("view");
		if (showVacationTab) allowed.push("vacation");
		return allowed.includes(activeTab) ? activeTab : defaultTab;
	}, [activeTab, showViewTab, showVacationTab, showGeneralTab, defaultTab]);

	return (
		<Tabs value={computedActiveTab} onValueChange={onTabChange ?? (() => {})}>
			<TabsList
				className={cn(
					"grid w-full bg-muted/40 backdrop-blur-sm gap-0",
					(() => {
						const count = (showViewTab ? 1 : 0) + (showGeneralTab ? 1 : 0) + (showVacationTab ? 1 : 0);
						return count === 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1";
					})()
				)}
			>
				{showViewTab && (
					<TabsTrigger value="view" className="py-1">
						<View className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-[0.8rem] leading-none">{i18n.getMessage("tab_view", isLocalized)}</span>
					</TabsTrigger>
				)}
				{showGeneralTab && (
					<TabsTrigger value="general" className="py-1">
						<Settings2 className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-[0.8rem] leading-none">{i18n.getMessage("tab_general", isLocalized)}</span>
					</TabsTrigger>
				)}
				{showVacationTab && (
					<TabsTrigger value="vacation" className="w-full relative py-1">
						<Plane className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-[0.8rem] leading-none">{i18n.getMessage("tab_vacation", isLocalized)}</span>
					</TabsTrigger>
				)}
			</TabsList>

			{showGeneralTab && (
				<TabsContent value="general" className="pt-3 space-y-3">
					<GeneralSettings isLocalized={isLocalized} />
					<ThemeSelector isLocalized={isLocalized} />
				</TabsContent>
			)}

			{showViewTab && (
				<TabsContent value="view" className="pt-3 space-y-3">
					{customViewSelector ? (
						<div className="space-y-2 rounded-md border p-2 bg-background/40 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<View className="h-3.5 w-3.5" />
									<span className="text-[0.8rem] font-medium leading-none">
										{i18n.getMessage("settings_view", isLocalized)}
									</span>
								</div>
								{!hideViewModeToolbar && <ViewModeToolbar />}
							</div>

							{customViewSelector}
						</div>
					) : (
						<ViewSettings
							isLocalized={isLocalized}
							{...(currentCalendarView ? { currentCalendarView } : {})}
							{...(activeView ? { activeView } : {})}
							{...(onCalendarViewChange ? { onCalendarViewChange } : {})}
							hideViewModeToolbar={hideViewModeToolbar}
							hideChatSettings={Array.isArray(allowedTabs) && allowedTabs.length === 1 && allowedTabs.includes("view")}
						/>
					)}
				</TabsContent>
			)}

			{showVacationTab && (
				<TabsContent value="vacation" className="pt-3">
					<div className="space-y-3">
						<div className="rounded-md border p-2 bg-background/40 backdrop-blur-sm">
							{computedActiveTab === "vacation" && <VacationPeriods />}
						</div>
					</div>
				</TabsContent>
			)}
		</Tabs>
	);
}
