"use client";

import { i18n } from "@shared/libs/i18n";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { Plane, Settings2, View } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/shared/ui/animate-ui/components/radix/tabs";
import { VacationPeriods } from "../vacation-periods";
import { GeneralSettings } from "./general-settings";
import { ThemeSelector } from "./theme-selector";
import { ViewSettings } from "./view-settings";

// No-op function for empty handlers
function noop(): void {
	// Handler managed by parent component
}

type SettingsTabsProps = {
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
	/** Hide free roam / dual calendar / default selector toolbar */
	hideViewModeToolbar?: boolean;
};

// View mode selection is handled by ViewModeToolbar

// Helper to determine which tabs to display
function getVisibleTabs(
	allowedTabs: readonly string[] | undefined,
	isCalendarPage: boolean
) {
	const showViewTab = Array.isArray(allowedTabs)
		? allowedTabs.includes("view")
		: isCalendarPage;
	const showVacationTab = Array.isArray(allowedTabs)
		? allowedTabs.includes("vacation")
		: isCalendarPage;
	const showGeneralTab = Array.isArray(allowedTabs)
		? allowedTabs.includes("general")
		: true;

	return { showViewTab, showVacationTab, showGeneralTab };
}

// Helper to get default tab based on visible tabs
function getDefaultTab(
	showViewTab: boolean,
	showGeneralTab: boolean,
	showVacationTab: boolean
): string {
	if (showViewTab) {
		return "view";
	}
	if (showGeneralTab) {
		return "general";
	}
	if (showVacationTab) {
		return "vacation";
	}
	return "view";
}

// Constants
const TAB_TEXT_SIZE = "text-[0.8rem]";
const TAB_COUNT_THREE = 3;
const TAB_COUNT_TWO = 2;

// Helper to calculate grid columns based on visible tab count
function getGridColsClass(tabCount: number): string {
	if (tabCount === TAB_COUNT_THREE) {
		return "grid-cols-3";
	}
	if (tabCount === TAB_COUNT_TWO) {
		return "grid-cols-2";
	}
	return "grid-cols-1";
}

export function SettingsTabs({
	isLocalized = false,
	activeTab = "view",
	onTabChange,
	currentCalendarView: _currentCalendarView,
	activeView: _activeView,
	onCalendarViewChange: _onCalendarViewChange,
	customViewSelector,
	isCalendarPage = true,
	allowedTabs,
	hideViewModeToolbar,
}: SettingsTabsProps) {
	useSettings();
	// View mode change logic lives in ViewModeToolbar

	// Removed auto-switching tabs when not on calendar page to avoid update loops.

	// Determine which tabs to show
	const { showViewTab, showVacationTab, showGeneralTab } = getVisibleTabs(
		allowedTabs,
		isCalendarPage
	);

	// Ensure active tab is valid when some tabs are hidden (e.g., dashboard page)
	const defaultTab = getDefaultTab(
		showViewTab,
		showGeneralTab,
		showVacationTab
	);

	// Helper to compute active tab value
	const computeActiveTab = useCallback(() => {
		const allowed: string[] = [];
		if (showGeneralTab) {
			allowed.push("general");
		}
		if (showViewTab) {
			allowed.push("view");
		}
		if (showVacationTab) {
			allowed.push("vacation");
		}
		return allowed.includes(activeTab) ? activeTab : defaultTab;
	}, [activeTab, showGeneralTab, showViewTab, showVacationTab, defaultTab]);

	const computedActiveTab = useMemo(
		() => computeActiveTab(),
		[computeActiveTab]
	);

	const tabCount =
		(showViewTab ? 1 : 0) +
		(showGeneralTab ? 1 : 0) +
		(showVacationTab ? 1 : 0);
	const gridColsClass = getGridColsClass(tabCount);

	return (
		<Tabs onValueChange={onTabChange ?? noop} value={computedActiveTab}>
			<TabsList
				className={cn(
					"grid w-full gap-0 bg-muted/40 backdrop-blur-sm",
					gridColsClass
				)}
			>
				{showViewTab && (
					<TabsTrigger className="py-1" value="view">
						<View className="mr-1.5 h-3.5 w-3.5" />
						<span className={`${TAB_TEXT_SIZE} leading-none`}>
							{i18n.getMessage("tab_view", isLocalized)}
						</span>
					</TabsTrigger>
				)}
				{showGeneralTab && (
					<TabsTrigger className="py-1" value="general">
						<Settings2 className="mr-1.5 h-3.5 w-3.5" />
						<span className={`${TAB_TEXT_SIZE} leading-none`}>
							{i18n.getMessage("tab_general", isLocalized)}
						</span>
					</TabsTrigger>
				)}
				{showVacationTab && (
					<TabsTrigger className="relative w-full py-1" value="vacation">
						<Plane className="mr-1.5 h-3.5 w-3.5" />
						<span className={`${TAB_TEXT_SIZE} leading-none`}>
							{i18n.getMessage("tab_vacation", isLocalized)}
						</span>
					</TabsTrigger>
				)}
			</TabsList>

			{showGeneralTab && (
				<TabsContent className="space-y-3 pt-3" value="general">
					<GeneralSettings isLocalized={isLocalized} />
					<ThemeSelector isLocalized={isLocalized} />
				</TabsContent>
			)}

			{showViewTab && (
				<TabsContent className="space-y-3 pt-3" value="view">
					{customViewSelector ? (
						customViewSelector
					) : (
						<ViewSettings
							{...(typeof _activeView === "string" && {
								activeView: _activeView,
							})}
							{...(typeof _currentCalendarView === "string" && {
								currentCalendarView: _currentCalendarView,
							})}
							{...(hideViewModeToolbar !== undefined && {
								hideViewModeToolbar,
							})}
							isLocalized={isLocalized}
							{...(typeof _onCalendarViewChange === "function" && {
								onCalendarViewChange: _onCalendarViewChange,
							})}
						/>
					)}
				</TabsContent>
			)}

			{showVacationTab && (
				<TabsContent className="space-y-3 pt-3" value="vacation">
					<VacationPeriods />
				</TabsContent>
			)}
		</Tabs>
	);
}
