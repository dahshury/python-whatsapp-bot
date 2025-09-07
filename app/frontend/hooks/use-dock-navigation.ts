"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar";
import { getValidRange } from "@/lib/calendar-config";
import { count } from "@/lib/dev-profiler";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import { useVacation } from "@/lib/vacation-context";
import type { ExtendedNavigationContextValue } from "@/types/navigation";

interface UseDockNavigationProps {
	calendarRef?: React.RefObject<CalendarCoreRef> | null;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
}

export function useDockNavigation({
	calendarRef,
	currentCalendarView = "multiMonthYear",
	onCalendarViewChange,
}: UseDockNavigationProps): ExtendedNavigationContextValue {
	const pathname = usePathname();
	const router = useRouter();
	const { isLocalized } = useLanguage();
	const { freeRoam, showDualCalendar } = useSettings();
	const { recordingState } = useVacation();

	const [mounted, setMounted] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("view");
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	// Use the provided calendarRef directly
	const isCalendarPage = pathname === "/";

	// Auto-switch to general tab when not on calendar page
	React.useEffect(() => {
		if (!isCalendarPage && activeTab === "view") {
			setActiveTab("general");
		}
	}, [isCalendarPage, activeTab]);

	const {
		title,
		activeView,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		handlePrev: originalHandlePrev,
		handleNext: originalHandleNext,
		handleToday: originalHandleToday,
		visibleEventCount,
	} = useCalendarToolbar({
		calendarRef: isCalendarPage && calendarRef ? calendarRef : null,
		currentView: currentCalendarView,
	});

	const handlePrev = React.useCallback(() => {
		count("dockNav:handlePrev");
		if (!isCalendarPage) {
			router.push("/");
		} else {
			originalHandlePrev();
		}
	}, [isCalendarPage, router, originalHandlePrev]);

	const handleNext = React.useCallback(() => {
		count("dockNav:handleNext");
		if (!isCalendarPage) {
			router.push("/");
		} else {
			originalHandleNext();
		}
	}, [isCalendarPage, router, originalHandleNext]);

	const handleToday = React.useCallback(() => {
		count("dockNav:handleToday");
		if (!isCalendarPage) {
			router.push("/");
		} else {
			originalHandleToday();
		}
	}, [isCalendarPage, router, originalHandleToday]);

	const handleCalendarViewChange = React.useCallback(
		(view: string) => {
			count("dockNav:viewChange");
			if (isCalendarPage && calendarRef?.current) {
				const api = calendarRef.current.getApi?.();
				if (api) {
					// Temporarily adjust options around multimonth transitions to avoid plugin issues
					try {
						// Always clear constraints before changing view
						api.setOption("validRange", undefined);
						api.setOption("eventConstraint", undefined);
						api.setOption("selectConstraint", undefined);
						// Change view first
						api.changeView(view);
						// Reapply constraints only for non-multimonth views
						const lower = (view || "").toLowerCase();
						const isMultiMonth = lower === "multimonthyear";
						if (!isMultiMonth) {
							api.setOption(
								"validRange",
								freeRoam ? undefined : getValidRange(freeRoam),
							);
							// For timeGrid views only
							if (lower.includes("timegrid")) {
								api.setOption(
									"eventConstraint",
									freeRoam ? undefined : "businessHours",
								);
								api.setOption(
									"selectConstraint",
									freeRoam ? undefined : "businessHours",
								);
							}
						}
					} catch {}
					try {
						const opts = getCalendarViewOptions(isLocalized);
						const label = (
							opts.find((o) => o.value === view)?.label ?? view
						).toString();
						toastService.info(
							isLocalized ? "تم تغيير العرض" : "View changed",
							label,
							1500,
						);
					} catch {}
				}
			}
			onCalendarViewChange?.(view);
		},
		[isCalendarPage, calendarRef, onCalendarViewChange, isLocalized, freeRoam],
	);

	const isActive = React.useCallback(
		(href: string) => {
			if (href === "/" && pathname === "/") return true;
			if (href !== "/" && pathname.startsWith(href)) return true;
			return false;
		},
		[pathname],
	);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const viewMode = freeRoam
		? "freeRoam"
		: showDualCalendar
			? "dual"
			: "default";

	// Log once when calendar API becomes available
	React.useEffect(() => {
		if (isCalendarPage && calendarRef?.current?.getApi) {
			try {
				const api = calendarRef.current.getApi();
				if (api) {
					count("dockNav:apiReady");
				}
			} catch {}
		}
	}, [isCalendarPage, calendarRef]);

	// Keep the user's chosen tab; do not auto-switch based on view mode

	return React.useMemo(
		() =>
			({
				state: {
					mounted,
					isHoveringDate,
					activeTab,
				},
				handlers: {
					setIsHoveringDate,
					setActiveTab,
					handleLanguageToggle: () => {}, // These will be handled by individual components
					handleThemeToggle: () => {}, // These will be handled by individual components
					handleViewModeChange: () => {}, // These will be handled by individual components
					handleCalendarViewChange,
				},
				computed: {
					viewMode,
					isRecording: recordingState.periodIndex !== null,
					isActive,
				},
				// Additional properties for easier access
				navigation: {
					title,
					activeView,
					isPrevDisabled,
					isNextDisabled,
					isTodayDisabled,
					handlePrev,
					handleNext,
					handleToday,
					isCalendarPage,
					isLocalized,
					visibleEventCount,
				},
			}) as ExtendedNavigationContextValue,
		[
			mounted,
			isHoveringDate,
			activeTab,
			handleCalendarViewChange,
			viewMode,
			recordingState.periodIndex,
			isActive,
			title,
			activeView,
			isPrevDisabled,
			isNextDisabled,
			isTodayDisabled,
			handlePrev,
			handleNext,
			handleToday,
			isCalendarPage,
			isLocalized,
			visibleEventCount,
		],
	);
}
