"use client";

import {
	CalendarLink,
	NavigationControls,
	NavigationDateButton,
	NavigationLinks,
} from "@/components/navigation";
import { SettingsPopover } from "@/components/settings";
import { Badge } from "@/components/ui/badge";
import { Dock } from "@/components/ui/dock";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDockNavigation } from "@/hooks/use-dock-navigation";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type {
	DockNavProps,
	ExtendedNavigationContextValue,
} from "@/types/navigation";

export function DockNav({
	className = "",
	currentCalendarView = "multiMonthYear",
	calendarRef,
	onCalendarViewChange,
	navigationOnly = false,
	variant: _variant = "default",
}: DockNavProps) {
	const nav = useDockNavigation({
		calendarRef,
		currentCalendarView,
		onCalendarViewChange,
	}) as ExtendedNavigationContextValue;
	const { isLocalized } = useLanguage();

	if (!nav.state.mounted) {
		return null;
	}

	const { navigation } = nav;

	return (
		<TooltipProvider>
			<Dock
				direction="middle"
				className={cn("mt-4 h-auto min-h-[44px]", className)}
			>
				{navigationOnly ? (
					<>
						<NavigationControls
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>

						<NavigationDateButton
							title={navigation.title}
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={navigationOnly}
						/>
						{typeof navigation.visibleEventCount === "number" && (
							<Badge variant="secondary" className="ml-2">
								{navigation.visibleEventCount}{" "}
								{i18n.getMessage("calendar_events", isLocalized)}
							</Badge>
						)}
					</>
				) : !navigation.isCalendarPage ? (
					<CalendarLink isLocalized={navigation.isLocalized} />
				) : (
					<>
						<NavigationControls
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>

						<NavigationDateButton
							title={navigation.title}
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={navigationOnly}
						/>
						{typeof navigation.visibleEventCount === "number" && (
							<Badge variant="outline" className="ml-2">
								{navigation.visibleEventCount}{" "}
								{i18n.getMessage("calendar_events", isLocalized)}
							</Badge>
						)}
					</>
				)}

				{!navigationOnly && (
					<>
						<NavigationLinks
							isLocalized={navigation.isLocalized}
							isActive={nav.computed.isActive}
						/>

						<SettingsPopover
							isLocalized={navigation.isLocalized}
							activeTab={nav.state.activeTab}
							onTabChange={nav.handlers.setActiveTab}
							currentCalendarView={currentCalendarView}
							activeView={navigation.activeView}
							onCalendarViewChange={nav.handlers.handleCalendarViewChange}
							isCalendarPage={navigation.isCalendarPage}
						/>
					</>
				)}
			</Dock>
		</TooltipProvider>
	);
}
