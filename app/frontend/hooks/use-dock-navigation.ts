"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { useVacation } from "@/lib/vacation-context";
import { toastService } from "@/lib/toast-service";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import type { NavigationContextValue } from "@/types/navigation";
import { count } from "@/lib/dev-profiler";
import { getValidRange } from "@/lib/calendar-config";

interface UseDockNavigationProps {
	calendarRef?: React.RefObject<CalendarCoreRef> | null;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
}

export function useDockNavigation({
	calendarRef,
	currentCalendarView = "multiMonthYear",
	onCalendarViewChange,
}: UseDockNavigationProps): NavigationContextValue {
	const pathname = usePathname();
	const router = useRouter();
	const { isRTL } = useLanguage();
	const { freeRoam, showDualCalendar } = useSettings();
	const { recordingState } = useVacation();

	const [mounted, setMounted] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("view");
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	const fallbackRef = React.useRef<any>(null);
	const _effectiveCalendarRef = calendarRef || fallbackRef;
	const isCalendarPage = pathname === "/";

	// Auto-switch to general tab when not on calendar page
	React.useEffect(() => {
		if (!isCalendarPage && (activeTab === "view" || activeTab === "vacation")) {
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
	} = useCalendarToolbar({
		calendarRef: isCalendarPage ? _effectiveCalendarRef : fallbackRef,
		currentView: currentCalendarView,
		freeRoam,
		onViewChange: onCalendarViewChange,
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
			const targetRef = _effectiveCalendarRef;
			if (isCalendarPage && targetRef?.current) {
				const api = targetRef.current.getApi?.();
				if (api) {
					// Temporarily adjust validRange around multimonth transitions to avoid plugin issues
					try {
						if (view === "multiMonthYear") {
							api.setOption("validRange", undefined);
						} else {
							api.setOption(
								"validRange",
								freeRoam ? undefined : getValidRange(freeRoam),
							);
						}
					} catch {}
					api.changeView(view);
					try {
						const opts = getCalendarViewOptions(isRTL);
						const label = (opts.find(o => o.value === view)?.label ?? view).toString();
						toastService.info(isRTL ? "تم تغيير العرض" : "View changed", label, 1500);
					} catch {}
				}
			}
			onCalendarViewChange?.(view);
		},
		[isCalendarPage, _effectiveCalendarRef, onCalendarViewChange, isRTL, freeRoam],
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
		const ref = isCalendarPage ? _effectiveCalendarRef : fallbackRef;
		if (ref?.current?.getApi) {
			try {
				const api = ref.current.getApi();
				if (api) {
					count("dockNav:apiReady");
				}
			} catch {}
		}
	}, [isCalendarPage, _effectiveCalendarRef]);

	React.useEffect(() => {
		if (activeTab === "vacation" && viewMode !== "default") {
			setActiveTab("view");
		}
	}, [viewMode, activeTab]);

	return {
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
			isRTL,
		},
	} as NavigationContextValue & { navigation: any };
}
