import type { DateRestrictions } from "@/lib/date-restrictions";
import type { TempusFormat, TempusTheme } from "./tempus-dominus.types";

export interface BuildOptionsParams {
	format: TempusFormat;
	restrictions: DateRestrictions;
	theme: TempusTheme;
	locale?: string; // default en-GB
	steppingMinutes?: number; // default from env or 120
}

export function getDefaultStepping(): number {
	try {
		const env = process.env.NEXT_PUBLIC_SLOT_DURATION_HOURS;
		const parsed = env !== undefined ? Number(env) : Number.NaN;
		return Number.isFinite(parsed) && parsed > 0
			? Math.max(1, Math.floor(parsed * 60))
			: 120;
	} catch {
		return 120;
	}
}

export function buildTempusDominusOptions({
	format,
	restrictions,
	theme,
	locale = "en-GB",
	steppingMinutes,
}: BuildOptionsParams) {
	const isTime = format === "time";
	const isDate = format === "date";

	const components = {
		calendar: !isTime,
		date: !isTime,
		month: !isTime,
		year: !isTime,
		decades: !isTime,
		clock: !isDate,
		hours: !isDate,
		minutes: !isDate,
		seconds: false,
	};

	const formatString = isTime
		? "hh:mm A"
		: isDate
			? "dd/MM/yyyy"
			: "dd/MM/yyyy hh:mm A";

	const options = {
		display: {
			components,
			theme: theme,
			buttons: { today: true, clear: false, close: false },
			placement: "bottom" as const,
			keepOpen: true,
		},
		restrictions: {
			...(restrictions.minDate && { minDate: restrictions.minDate }),
			...(restrictions.maxDate && { maxDate: restrictions.maxDate }),
			...(restrictions.disabledDates && {
				disabledDates: restrictions.disabledDates,
			}),
			...(restrictions.daysOfWeekDisabled && {
				daysOfWeekDisabled: restrictions.daysOfWeekDisabled,
			}),
			...(restrictions.enabledHours && {
				enabledHours: restrictions.enabledHours,
			}),
		},
		localization: {
			locale,
			format: formatString,
			hourCycle: "h12" as const,
		},
		container: undefined as undefined | HTMLElement,
		stepping: steppingMinutes ?? getDefaultStepping(),
	};

	if (typeof document !== "undefined") {
		options.container = document.body as HTMLElement;
	}

	return options as unknown as import("./tempus-dominus.types").TempusDominusOptions;
}
