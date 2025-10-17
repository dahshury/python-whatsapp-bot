"use client";

import type { ExtendedNavigationContextValue } from "@features/navigation/types";
import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { count } from "@shared/libs/dev-profiler";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { toastService } from "@shared/libs/toast/toast-service";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCalendarViewOptions } from "@/widgets/calendar/calendar-toolbar";
import { useCalendarToolbar } from "@/widgets/calendar/hooks/use-calendar-toolbar";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

const VIEW_CHANGE_TOAST_DURATION_MS = 1500;

// Helper to determine view mode based on settings
function getViewMode(freeRoam: boolean, showDualCalendar: boolean): string {
	if (freeRoam) {
		return "freeRoam";
	}
	if (showDualCalendar) {
		return "dual";
	}
	return "default";
}

type UseDockNavigationProps = {
	calendarRef?: React.RefObject<CalendarCoreRef> | null;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
};

// No-op handler for unused toggles
function noop(): void {
	// Handler managed by individual components
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

	const [mounted, setMounted] = useState(false);
	const [activeTab, setActiveTab] = useState("view");
	const [isHoveringDate, setIsHoveringDate] = useState(false);

	// Use the provided calendarRef directly
	const isCalendarPage = pathname === "/";
	const isDocumentsPage = pathname?.startsWith("/documents") ?? false;

	// Auto-switch to general tab when not on calendar page
	useEffect(() => {
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
		calendarRef: calendarRef ? calendarRef : null,
		currentView: currentCalendarView,
	});

	const handlePrev = useCallback(() => {
		count("dockNav:handlePrev");
		if (calendarRef?.current?.getApi) {
			originalHandlePrev();
			return;
		}
		if (isCalendarPage) {
			originalHandlePrev();
		} else {
			router.push("/");
		}
	}, [isCalendarPage, router, originalHandlePrev, calendarRef]);

	const handleNext = useCallback(() => {
		count("dockNav:handleNext");
		if (calendarRef?.current?.getApi) {
			originalHandleNext();
			return;
		}
		if (isCalendarPage) {
			originalHandleNext();
		} else {
			router.push("/");
		}
	}, [isCalendarPage, router, originalHandleNext, calendarRef]);

	const handleToday = useCallback(() => {
		count("dockNav:handleToday");
		if (calendarRef?.current?.getApi) {
			originalHandleToday();
			return;
		}
		if (isCalendarPage) {
			originalHandleToday();
		} else {
			router.push("/");
		}
	}, [isCalendarPage, router, originalHandleToday, calendarRef]);

	// Helper to check if view is multimonth
	const isMultimonthView = useCallback(
		(viewName: string): boolean => viewName.toLowerCase() === "multimonthyear",
		[]
	);

	// Helper to check if view is timegrid
	const isTimegridView = useCallback(
		(viewName: string): boolean => viewName.toLowerCase().includes("timegrid"),
		[]
	);

	// Helper to clear calendar constraints
	const clearCalendarConstraints = useCallback(
		(apiObj: Record<string, unknown>) => {
			try {
				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("validRange", undefined);
				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("eventConstraint", undefined);
				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("selectConstraint", undefined);
			} catch {
				// Calendar API may fail in some contexts
			}
		},
		[]
	);

	// Helper to reapply calendar constraints based on view and settings
	const reapplyCalendarConstraints = useCallback(
		(apiObj: Record<string, unknown>, viewName: string) => {
			try {
				if (isMultimonthView(viewName)) {
					return; // Skip for multimonth views
				}

				// Always set validRange
				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("validRange", freeRoam ? undefined : getValidRange(freeRoam));

				// Set event/select constraints for timegrid views
				if (!isTimegridView(viewName)) {
					return;
				}

				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("eventConstraint", freeRoam ? undefined : "businessHours");
				(
					apiObj.setOption as
						| ((key: string, value: unknown) => void)
						| undefined
				)?.("selectConstraint", freeRoam ? undefined : "businessHours");
			} catch {
				// Calendar API may fail in some contexts
			}
		},
		[freeRoam, isMultimonthView, isTimegridView]
	);

	// Helper to notify view change via toast
	const notifyViewChangedToUser = useCallback(
		(viewName: string) => {
			try {
				const opts = getCalendarViewOptions(isLocalized);
				const label = (
					opts.find((o) => o.value === viewName)?.label ?? viewName
				).toString();
				toastService.info(
					i18n.getMessage("view_changed", isLocalized),
					label,
					VIEW_CHANGE_TOAST_DURATION_MS
				);
			} catch {
				// View change notification may fail in some contexts
			}
		},
		[isLocalized]
	);

	const handleCalendarViewChange = useCallback(
		(view: string) => {
			if (!isCalendarPage) {
				return;
			}

			const api = calendarRef?.current?.getApi?.();
			if (!api) {
				return;
			}

			const apiObj = api as unknown as Record<string, unknown>;

			clearCalendarConstraints(apiObj);

			try {
				(apiObj.changeView as (v: string) => void)?.(view);
			} catch {
				// Calendar API may fail during view transitions
			}

			reapplyCalendarConstraints(apiObj, view);
			notifyViewChangedToUser(view);
			onCalendarViewChange?.(view);
		},
		[
			isCalendarPage,
			calendarRef,
			onCalendarViewChange,
			clearCalendarConstraints,
			reapplyCalendarConstraints,
			notifyViewChangedToUser,
		]
	);

	const isActive = useCallback(
		(href: string) => {
			if (href === "/" && pathname === "/") {
				return true;
			}
			if (href !== "/" && pathname.startsWith(href)) {
				return true;
			}
			return false;
		},
		[pathname]
	);

	useEffect(() => {
		setMounted(true);
	}, []);

	const viewMode = getViewMode(freeRoam, showDualCalendar);

	// Log once when calendar API becomes available
	useEffect(() => {
		if (isCalendarPage && calendarRef?.current?.getApi) {
			try {
				const api = calendarRef.current.getApi();
				if (api) {
					count("dockNav:apiReady");
				}
			} catch {
				// Calendar API may not be ready in some contexts
			}
		}
	}, [isCalendarPage, calendarRef]);

	// Keep the user's chosen tab; do not auto-switch based on view mode

	return useMemo(
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
					handleLanguageToggle: noop,
					handleThemeToggle: noop,
					handleViewModeChange: noop,
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
					isDocumentsPage,
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
			isDocumentsPage,
			isLocalized,
			visibleEventCount,
		]
	);
}
