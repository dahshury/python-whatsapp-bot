export type VacationDateChecker = (dateStr: string) => boolean;

import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";

export interface CalendarCallbackHandlers {
	isChangingHours: boolean;
	setIsChangingHours: (v: boolean) => void;
	isRTL: boolean;
	currentView: string;
	isVacationDate: (d: string) => boolean;
	openEditor: (opts: { start: string; end?: string }) => void;
	handleOpenConversation: (id: string) => void;
	handleEventChange: (eventId: string, updates: any) => void;
}

export interface CalendarCallbacks {
	// FullCalendar-compatible callback shapes expected by components
	dateClick: (info: any) => void;
	select: (info: any) => void;
	eventClick: (info: any) => void;
}

export function createCalendarCallbacks(
	handlers: CalendarCallbackHandlers,
	freeRoam: boolean,
	_timezone: string,
	currentDate: Date | string | undefined,
	handleVacationDateClick?: (date: Date) => void,
	setCurrentDate?: (d: Date) => void,
	updateSlotTimes?: (date: Date, force?: boolean) => void,
	currentView?: string,
): CalendarCallbacks {
	const getDateOnly = (value: string | Date): string => {
		const d = typeof value === "string" ? new Date(value) : value;
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	};
	const atMidday = (dateOnly: string): Date => new Date(`${dateOnly}T12:00:00`);
	const toMinutes = (time: string | undefined): number | null => {
		if (!time) return null;
		const [h, m] = time.split(":");
		const hh = parseInt(h || "0", 10);
		const mm = parseInt(m || "0", 10);
		if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
		return hh * 60 + mm;
	};

	return {
		// Handle clicking a day cell
		dateClick: (info: any) => {
			const clickedDate: Date =
				info?.date instanceof Date
					? info.date
					: new Date(info?.date || Date.now());

			// If recording vacation, delegate to vacation handler
			if (handleVacationDateClick) {
				handleVacationDateClick(clickedDate);
				return;
			}

			const dateOnly = info?.dateStr
				? (info.dateStr as string).split("T")[0]
				: getDateOnly(clickedDate);

			// Skip vacation days
			if (handlers.isVacationDate(dateOnly)) return;

			// Determine if hours will switch by comparing slot times for current vs clicked date (use midday to avoid timezone edge cases)
			const prevDateOnly = currentDate
				? getDateOnly(currentDate)
				: getDateOnly(new Date());
			const viewType: string =
				info?.view?.type || (currentView as string) || "";
			const prevTimes = getSlotTimes(
				atMidday(prevDateOnly),
				freeRoam,
				viewType,
			);
			const nextTimes = getSlotTimes(atMidday(dateOnly), freeRoam, viewType);
			// Compare against the ACTUAL active slot options from FullCalendar (avoids stale state)
			let activeMin: string | undefined;
			let activeMax: string | undefined;
			try {
				// FullCalendar API
				const cal = (info as any)?.view?.calendar;
				if (cal?.getOption) {
					activeMin = cal.getOption("slotMinTime");
					activeMax = cal.getOption("slotMaxTime");
				}
			} catch {
				// ignore
			}
			const baselineMin = activeMin ?? prevTimes.slotMinTime;
			const baselineMax = activeMax ?? prevTimes.slotMaxTime;
			const isSwitchingHours = (() => {
				const aMin = toMinutes(baselineMin);
				const aMax = toMinutes(baselineMax);
				const nMin = toMinutes(nextTimes.slotMinTime);
				const nMax = toMinutes(nextTimes.slotMaxTime);
				if (aMin == null || aMax == null || nMin == null || nMax == null) {
					return (
						baselineMin !== nextTimes.slotMinTime ||
						baselineMax !== nextTimes.slotMaxTime
					);
				}
				return aMin !== nMin || aMax !== nMax;
			})();

			// Update current date and slot times so hours switch (e.g., Saturday hours)
			if (setCurrentDate) setCurrentDate(clickedDate);
			if (updateSlotTimes) updateSlotTimes(clickedDate, isSwitchingHours);

			// If hours are switching, don't open the editor (treat this click as purely a range change)
			if (isSwitchingHours) return;

			// Open editor: include time (with computed end) for timeGrid, date-only otherwise
			if (viewType?.toLowerCase().includes("timegrid")) {
				// Ensure clicks outside business hours snap to the day's slotMinTime (e.g., Saturday 16:00)
				let startStr: string =
					info?.dateStr || `${dateOnly}T${nextTimes.slotMinTime}`;
				try {
					const timePart = startStr.split("T")[1] || nextTimes.slotMinTime;
					const [hh, mm, _ss] = timePart
						.split(":")
						.map((v) => parseInt(v || "0", 10));
					const [minH, minM] = nextTimes.slotMinTime
						.split(":")
						.map((v) => parseInt(v || "0", 10));
					const [maxH, maxM] = nextTimes.slotMaxTime
						.split(":")
						.map((v) => parseInt(v || "0", 10));
					const currentMin = hh * 60 + mm;
					const allowedMin = minH * 60 + minM;
					const allowedMax = maxH * 60 + maxM;
					if (currentMin < allowedMin || currentMin >= allowedMax) {
						startStr = `${dateOnly}T${nextTimes.slotMinTime}`;
					}
				} catch {
					startStr = `${dateOnly}T${nextTimes.slotMinTime}`;
				}
				const startDate = new Date(startStr);
				// If not in free roam and the clicked time is in the past, do not open the editor
				if (!freeRoam && startDate.getTime() < Date.now()) return;
				const endDate = new Date(
					startDate.getTime() + SLOT_DURATION_HOURS * 60 * 60 * 1000,
				);
				handlers.openEditor({
					start: startDate.toISOString(),
					end: endDate.toISOString(),
				});
			} else {
				// For date-only views, prevent opening editor on past calendar dates when not in free roam
				if (!freeRoam) {
					const todayMidnight = new Date();
					todayMidnight.setHours(0, 0, 0, 0);
					const clickedMidnight = new Date(`${dateOnly}T00:00:00`);
					if (clickedMidnight.getTime() < todayMidnight.getTime()) return;
				}
				handlers.openEditor({ start: dateOnly });
			}
		},

		// Handle drag-select range in time grid
		select: (info: any) => {
			// If recording vacation, treat selection same as a click on the start date
			if (handleVacationDateClick) {
				const startStr: string | undefined = info?.startStr;
				const d = startStr ? new Date(startStr) : new Date();
				handleVacationDateClick(d);
				return;
			}
			const startStr: string | undefined = info?.startStr;
			const endStr: string | undefined = info?.endStr;

			if (startStr) {
				const startDateOnly = startStr.split("T")[0];
				if (handlers.isVacationDate(startDateOnly)) return;
			}

			// Prevent past selection when not in free roam
			if (!freeRoam && startStr) {
				const start = new Date(startStr);
				if (start.getTime() < Date.now()) return;
			}

			handlers.openEditor({ start: startStr || "", end: endStr });
		},

		// Event click (used primarily in dual calendar)
		eventClick: (info: any) => {
			const id: string | undefined = info?.event?.id;
			if (id) {
				handlers.handleOpenConversation(id);
			}
		},
	};
}
