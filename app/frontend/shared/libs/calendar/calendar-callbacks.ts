export type VacationDateChecker = (dateStr: string) => boolean;

import { getSlotTimes, SLOT_DURATION_HOURS } from "./calendar-config";

// Constants for time calculations
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_HOUR = 3_600_000;
const RADIX_10 = 10;

export type CalendarCallbackHandlers = {
	isLocalized: boolean;
	currentView: string;
	isVacationDate: (d: string) => boolean;
	openEditor: (opts: { start: string; end?: string }) => void;
	handleOpenConversation: (id: string) => void;
	handleEventChange: (
		info: import("@fullcalendar/core").EventChangeArg
	) => Promise<void>;
};

// FullCalendar callback info types
export type DateClickInfo = {
	date: Date;
	dateStr: string;
	allDay: boolean;
	view: {
		type: string;
		calendar?: {
			getOption: <T>(option: string) => T;
		};
	};
};

type SelectInfo = {
	start: Date;
	end: Date;
	startStr: string;
	endStr: string;
	allDay: boolean;
	view: {
		type: string;
	};
};

type EventClickInfo = {
	event: {
		id: string;
		title: string;
		start: Date | null;
		end?: Date | null;
	};
	el: HTMLElement;
	view: {
		type: string;
	};
};

export type CalendarCallbacks = {
	// FullCalendar-compatible callback shapes expected by components
	dateClick: (info: DateClickInfo) => void;
	select: (info: SelectInfo) => void;
	eventClick: (info: EventClickInfo) => void;
};

// Helper to organize callback options
type CallbackOptions = {
	handlers: CalendarCallbackHandlers;
	freeRoam: boolean;
	currentDate: Date | string | undefined;
	handleVacationDateClick?: (date: Date) => void;
	setCurrentDate?: (d: Date) => void;
	currentView?: string;
};

const getDateOnly = (value: string | Date): string => {
	const d = typeof value === "string" ? new Date(value) : value;
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const atMidday = (dateOnly: string): Date => new Date(`${dateOnly}T12:00:00`);

function parseTimeToMinutes(timeStr: string): number {
	const parts = timeStr
		.split(":")
		.map((v: string) => Number.parseInt(v || "0", RADIX_10));
	const [h = 0, m = 0] = parts;
	return h * MINUTES_PER_HOUR + m;
}

function isClickTimeInBusinessHours(
	clickedTime: string,
	minTime: string,
	maxTime: string
): boolean {
	const clickedMin = parseTimeToMinutes(clickedTime);
	const allowedMin = parseTimeToMinutes(minTime);
	const allowedMax = parseTimeToMinutes(maxTime);
	return clickedMin >= allowedMin && clickedMin < allowedMax;
}

function checkIfInProgressSlot(
	dateOnly: string,
	startStr: string,
	slotTimes: { slotMinTime: string; slotMaxTime: string }
): boolean {
	try {
		const timePart = (startStr.split("T")[1] ||
			slotTimes.slotMinTime) as string;
		const clickedMin = parseTimeToMinutes(timePart);
		const minMin = parseTimeToMinutes(slotTimes.slotMinTime);
		const duration = Math.max(
			MINUTES_PER_HOUR,
			(SLOT_DURATION_HOURS || 2) * MINUTES_PER_HOUR
		);
		const rel = Math.max(0, clickedMin - minMin);
		const slotIndex = Math.floor(rel / duration);
		const baseMinutes = minMin + slotIndex * duration;
		const endMinutes = baseMinutes + duration;
		const endH = String(Math.floor(endMinutes / MINUTES_PER_HOUR)).padStart(
			2,
			"0"
		);
		const endM = String(endMinutes % MINUTES_PER_HOUR).padStart(2, "0");
		const slotEnd = new Date(`${dateOnly}T${endH}:${endM}:00`).getTime();
		return Date.now() < slotEnd;
	} catch {
		// Time calculation failed, conservatively reject the click
		return false;
	}
}

function validateAndNormalizeStartTime(
	info: DateClickInfo,
	dateOnly: string,
	targetSlotTimes: { slotMinTime: string; slotMaxTime: string }
): string {
	let startStr: string =
		info?.dateStr || `${dateOnly}T${targetSlotTimes.slotMinTime}`;
	try {
		const timePart = startStr.split("T")[1] || targetSlotTimes.slotMinTime;
		if (
			!isClickTimeInBusinessHours(
				timePart,
				targetSlotTimes.slotMinTime,
				targetSlotTimes.slotMaxTime
			)
		) {
			startStr = `${dateOnly}T${targetSlotTimes.slotMinTime}`;
		}
	} catch {
		// Time validation failed, use minimum slot time
		startStr = `${dateOnly}T${targetSlotTimes.slotMinTime}`;
	}
	return startStr;
}

function checkPastTimeRestrictions(
	freeRoam: boolean,
	dateOnly: string,
	startStr: string,
	targetSlotTimes: { slotMinTime: string; slotMaxTime: string }
): boolean {
	const startDate = new Date(startStr);
	if (!freeRoam && startDate.getTime() < Date.now()) {
		return checkIfInProgressSlot(dateOnly, startStr, targetSlotTimes);
	}
	return true;
}

function checkSlotTimesWindowChange(
	isTimeGrid: boolean,
	freeRoam: boolean,
	currentSlotTimes: { slotMinTime: string; slotMaxTime: string },
	targetSlotTimes: { slotMinTime: string; slotMaxTime: string }
): boolean {
	return (
		isTimeGrid &&
		!freeRoam &&
		(currentSlotTimes.slotMinTime !== targetSlotTimes.slotMinTime ||
			currentSlotTimes.slotMaxTime !== targetSlotTimes.slotMaxTime)
	);
}

function getCurrentDateForSlots(
	currentDate: Date | string | undefined,
	fallbackDate: Date
): Date {
	try {
		if (typeof currentDate === "string") {
			return new Date(currentDate);
		}
		if (currentDate instanceof Date) {
			return currentDate;
		}
	} catch {
		// Current date parsing failed, use fallback
	}
	return fallbackDate;
}

function handleDateOnlyView(
	freeRoam: boolean,
	dateOnly: string,
	openEditor: (opts: { start: string; end?: string }) => void
): boolean {
	// For date-only views, prevent opening editor on past calendar dates when not in free roam
	if (freeRoam) {
		openEditor({ start: dateOnly || "" });
		return true;
	}

	const todayMidnight = new Date();
	todayMidnight.setHours(0, 0, 0, 0);
	const clickedMidnight = new Date(`${dateOnly}T00:00:00`);

	if (clickedMidnight.getTime() >= todayMidnight.getTime()) {
		openEditor({ start: dateOnly || "" });
		return true;
	}

	return false;
}

function validateDateClickBasics(
	info: DateClickInfo,
	handlers: CalendarCallbackHandlers,
	handleVacationDateClick?: (date: Date) => void
): { dateOnly: string; clickedDate: Date } | null {
	const clickedDate: Date =
		info?.date instanceof Date ? info.date : new Date(info?.date || Date.now());

	// If recording vacation, delegate to vacation handler
	if (handleVacationDateClick) {
		handleVacationDateClick(clickedDate);
		return null;
	}

	let dateOnly: string;
	if (info?.dateStr && typeof info.dateStr === "string") {
		const parts = info.dateStr.split("T");
		dateOnly = parts[0] || getDateOnly(clickedDate);
	} else {
		dateOnly = getDateOnly(clickedDate);
	}

	// Skip vacation days
	if (handlers.isVacationDate(dateOnly)) {
		return null;
	}

	return { dateOnly, clickedDate };
}

function handleDateClickCallback(
	info: DateClickInfo,
	opts: CallbackOptions
): void {
	const {
		handlers,
		freeRoam,
		currentDate,
		handleVacationDateClick,
		setCurrentDate,
		currentView,
	} = opts;

	// Validate basics first
	const result = validateDateClickBasics(
		info,
		handlers,
		handleVacationDateClick
	);
	if (!result) {
		return;
	}

	const { dateOnly, clickedDate } = result;
	const viewType: string = info?.view?.type || (currentView as string) || "";
	const isTimeGrid = viewType?.toLowerCase().includes("timegrid");

	// Compute slot times for the clicked date and currently displayed range
	const targetSlotTimes = getSlotTimes(
		atMidday(dateOnly || ""),
		freeRoam,
		viewType
	);

	const currentDateForSlots: Date = getCurrentDateForSlots(
		currentDate,
		clickedDate
	);

	const currentSlotTimes = getSlotTimes(
		atMidday(getDateOnly(currentDateForSlots)),
		freeRoam,
		viewType
	);

	// If in a time grid view and the displayed business hour window differs
	// from the clicked date's business hours, update the displayed range only
	if (
		checkSlotTimesWindowChange(
			isTimeGrid,
			freeRoam,
			currentSlotTimes,
			targetSlotTimes
		)
	) {
		if (setCurrentDate) {
			setCurrentDate(clickedDate);
		}
		return; // Do not open editor; just update displayed slot range
	}

	// Sync currentDate to the clicked date
	if (setCurrentDate) {
		setCurrentDate(clickedDate);
	}

	// Handle time grid vs date-only view differently
	if (!isTimeGrid) {
		handleDateOnlyView(freeRoam, dateOnly, handlers.openEditor);
		return;
	}

	// Time grid view - validate and open with time
	const startStr = validateAndNormalizeStartTime(
		info,
		dateOnly,
		targetSlotTimes
	);

	if (
		!checkPastTimeRestrictions(freeRoam, dateOnly, startStr, targetSlotTimes)
	) {
		return; // Past slot that is no longer active
	}

	const endDate = new Date(startStr);
	endDate.setTime(
		endDate.getTime() + SLOT_DURATION_HOURS * MILLISECONDS_PER_HOUR
	);
	handlers.openEditor({
		start: new Date(startStr).toISOString(),
		end: endDate.toISOString(),
	});
}

function checkStartDateVacation(
	startStr: string | undefined,
	isVacationDateFn: (d: string) => boolean
): boolean {
	if (!startStr) {
		return false;
	}
	const startDateOnly = startStr.split("T")[0];
	return isVacationDateFn(startDateOnly as string);
}

function checkPastSelectionRestriction(
	freeRoam: boolean,
	startStr: string | undefined,
	viewType: string | undefined,
	_isVacationDateFn: (d: string) => boolean
): boolean {
	if (freeRoam || !startStr) {
		return true; // Not restricted
	}

	const start = new Date(startStr);
	if (start.getTime() < Date.now()) {
		try {
			const dateOnly = startStr.split("T")[0] as string;
			const slotTimes = getSlotTimes(
				new Date(`${dateOnly}T12:00:00`),
				freeRoam,
				viewType || ""
			);
			return checkIfInProgressSlot(dateOnly, startStr, slotTimes);
		} catch {
			// Time calculation failed, conservatively block
			return false;
		}
	}

	return true;
}

function handleSelectCallback(info: SelectInfo, opts: CallbackOptions): void {
	const { handlers, freeRoam, handleVacationDateClick } = opts;

	// If recording vacation, treat selection same as a click on the start date
	if (handleVacationDateClick) {
		const startStr: string | undefined = info?.startStr;
		const d = startStr ? new Date(startStr) : new Date();
		handleVacationDateClick(d);
		return;
	}

	const startStr: string | undefined = info?.startStr;
	const endStr: string | undefined = info?.endStr;

	// Check if start date is a vacation day
	if (checkStartDateVacation(startStr, handlers.isVacationDate)) {
		return;
	}

	// Check past selection restrictions
	if (
		!checkPastSelectionRestriction(
			freeRoam,
			startStr,
			info?.view?.type,
			handlers.isVacationDate
		)
	) {
		return;
	}

	handlers.openEditor({ start: startStr || "", end: endStr });
}

export function createCalendarCallbacks(
	opts: CallbackOptions
): CalendarCallbacks {
	return {
		// Handle clicking a day cell
		dateClick: (info: DateClickInfo) => {
			handleDateClickCallback(info, opts);
		},

		// Handle drag-select range in time grid
		select: (info: SelectInfo) => {
			handleSelectCallback(info, opts);
		},

		// Event click (used primarily in dual calendar)
		eventClick: (info: EventClickInfo) => {
			const id: string | undefined = info?.event?.id;
			if (id) {
				opts.handlers.handleOpenConversation(id);
			}
		},
	};
}
