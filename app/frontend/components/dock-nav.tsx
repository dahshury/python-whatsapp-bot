"use client";

import {
	CalendarLink,
	NavigationControls,
	NavigationDateButton,
	NavigationLinks,
} from "@/components/navigation";
import { SettingsPopover } from "@/components/settings";
import { Dock } from "@/components/ui/dock";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDockNavigation } from "@/hooks/use-dock-navigation";
import { cn } from "@/lib/utils";
import type { DockNavProps } from "@/types/navigation";

export function DockNav({
	className = "",
	currentCalendarView = "multiMonthYear",
	calendarRef,
	onCalendarViewChange,
	navigationOnly = false,
	variant = "default",
}: DockNavProps) {
	const nav = useDockNavigation({
		calendarRef,
		currentCalendarView,
		onCalendarViewChange,
	});

	if (!nav.state.mounted) {
		return null;
	}

	const { navigation } = nav as any;

	return (
		<TooltipProvider>
			<Dock
				direction="middle"
				className={cn("mt-4 h-auto min-h-[44px]", className)}
			>
				{navigationOnly ? (
					<>
						<NavigationControls
							isRTL={navigation.isRTL}
							isCalendarPage={navigation.isCalendarPage}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>

						<NavigationDateButton
							title={navigation.title}
							isRTL={navigation.isRTL}
							isCalendarPage={navigation.isCalendarPage}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={navigationOnly}
						/>
					</>
				) : !navigation.isCalendarPage ? (
					<CalendarLink isRTL={navigation.isRTL} />
				) : (
					<>
						<NavigationControls
							isRTL={navigation.isRTL}
							isCalendarPage={navigation.isCalendarPage}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>

						<NavigationDateButton
							title={navigation.title}
							isRTL={navigation.isRTL}
							isCalendarPage={navigation.isCalendarPage}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={navigationOnly}
						/>
					</>
				)}

				{!navigationOnly && (
					<>
						<NavigationLinks
							isRTL={navigation.isRTL}
							isActive={nav.computed.isActive}
						/>

						<SettingsPopover
							isRTL={navigation.isRTL}
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
