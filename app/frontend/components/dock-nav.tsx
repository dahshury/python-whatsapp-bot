"use client";

import * as React from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
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
import { useCtrlViewSwitch } from "@/hooks/use-ctrl-view-switch";
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
		calendarRef: (calendarRef ||
			null) as React.RefObject<CalendarCoreRef> | null,
		currentCalendarView,
		onCalendarViewChange: onCalendarViewChange || (() => {}),
	}) as ExtendedNavigationContextValue;
	const { isLocalized } = useLanguage();

	// Bind Ctrl+ArrowUp/Down to change calendar view using existing handler
	// Compute next/prev view values from activeView
	const onCtrlUp = React.useCallback(() => {
		try {
			const opts = getCalendarViewOptions(isLocalized);
			const current = nav.navigation.activeView || currentCalendarView;
			const index = opts.findIndex((o) => o.value === current);
			const nextIndex = (index - 1 + opts.length) % opts.length;
			nav.handlers.handleCalendarViewChange(
				opts[nextIndex]?.value || "multiMonthYear",
			);
		} catch {}
	}, [
		isLocalized,
		nav.navigation.activeView,
		nav.handlers,
		currentCalendarView,
	]);

	const onCtrlDown = React.useCallback(() => {
		try {
			const opts = getCalendarViewOptions(isLocalized);
			const current = nav.navigation.activeView || currentCalendarView;
			const index = opts.findIndex((o) => o.value === current);
			const nextIndex = (index + 1) % opts.length;
			nav.handlers.handleCalendarViewChange(
				opts[nextIndex]?.value || "multiMonthYear",
			);
		} catch {}
	}, [
		isLocalized,
		nav.navigation.activeView,
		nav.handlers,
		currentCalendarView,
	]);

	useCtrlViewSwitch({ onUp: onCtrlUp, onDown: onCtrlDown });

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
							visibleEventCount={navigation.visibleEventCount}
						/>
						{/* Event count shown as overlay badge on the date button */}
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
							visibleEventCount={navigation.visibleEventCount}
						/>
						{/* Event count shown as overlay badge on the date button */}
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
