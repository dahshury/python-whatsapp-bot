type DataTableEvent = {
	id?: string | number;
	reservationId?: string;
	key?: string | number;
	start?: string | Date;
	startDate?: string | Date;
	date?: string | Date;
	begin?: string | Date;
	end?: string | Date;
	endDate?: string | Date;
	title?: string;
	name?: string;
	backgroundColor?: string;
	bgColor?: string;
	borderColor?: string;
	editable?: boolean;
	extendedProps?: {
		slotDate?: string;
		slotTime?: string;
		type?: string | number;
		cancelled?: boolean;
		reservationId?: string;
		[key: string]: unknown;
	};
	type?: string | number;
	cancelled?: boolean;
	[key: string]: unknown;
};

type CalendarEvent = {
	id: string;
	title: string;
	start: string | Date | undefined;
	end: string | Date | undefined;
	backgroundColor: string;
	borderColor: string;
	editable: boolean;
	extendedProps: {
		type: string | number;
		cancelled: boolean;
		reservationId?: string;
		slotDate?: string;
		slotTime?: string;
		[key: string]: unknown;
	};
};

const EMPTY_CALENDAR_EVENT: CalendarEvent = {
	id: "",
	title: "",
	start: undefined,
	end: undefined,
	backgroundColor: "",
	borderColor: "",
	editable: false,
	extendedProps: {
		type: 0,
		cancelled: false,
	},
};

const TIME_SPLIT_INDEX = 5;

function getEventStart(event: DataTableEvent): string | Date | undefined {
	return event.start || event.startDate || event.date || event.begin;
}

function getEventEnd(
	event: DataTableEvent,
	start: string | Date | undefined
): string | Date | undefined {
	return event.end || event.endDate || start;
}

function extractSlotDate(
	start: string | Date | undefined,
	extendedProps?: DataTableEvent["extendedProps"]
): string | undefined {
	if (extendedProps?.slotDate) {
		return extendedProps.slotDate;
	}
	if (typeof start === "string") {
		return String(start).split("T")[0];
	}
	return;
}

function extractSlotTime(
	start: string | Date | undefined,
	extendedProps?: DataTableEvent["extendedProps"]
): string | undefined {
	if (extendedProps?.slotTime) {
		return extendedProps.slotTime;
	}
	if (typeof start === "string") {
		return String(start).split("T")[1]?.slice(0, TIME_SPLIT_INDEX);
	}
	return;
}

function buildReservationIdProp(event: DataTableEvent): Record<string, string> {
	const reservationId =
		event.extendedProps?.reservationId ?? event.reservationId;
	return reservationId ? { reservationId } : {};
}

function buildSlotDateProp(slotDate?: string): Record<string, string> {
	return slotDate ? { slotDate } : {};
}

function buildSlotTimeProp(slotTime?: string): Record<string, string> {
	return slotTime ? { slotTime } : {};
}

export function convertDataTableEventToCalendarEvent(
	event: DataTableEvent
): CalendarEvent {
	if (!event) {
		return EMPTY_CALENDAR_EVENT;
	}

	const start = getEventStart(event);
	const end = getEventEnd(event, start);
	const slotDate = extractSlotDate(start, event.extendedProps);
	const slotTime = extractSlotTime(start, event.extendedProps);

	// Extract customer name from various possible sources
	const extractedCustomerName = event.extendedProps?.customerName;
	const customerName: string =
		(typeof event.title === "string" ? event.title : null) ??
		(typeof event.name === "string" ? event.name : null) ??
		(typeof (event as { customer_name?: string }).customer_name === "string"
			? (event as { customer_name?: string }).customer_name
			: null) ??
		(typeof extractedCustomerName === "string"
			? extractedCustomerName
			: null) ??
		"";

	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		`[CalendarConverter] Converting event: id=${event.id} customer_name="${(event as { customer_name?: string }).customer_name}" title="${event.title}" → customerName="${customerName}" | Full input:`,
		JSON.parse(JSON.stringify(event)),
		"| Output extendedProps will have customerName=",
		customerName
	);

	return {
		id: String(event.id ?? event.reservationId ?? event.key ?? Math.random()),
		title: String(customerName ?? ""),
		start,
		end,
		backgroundColor: event.backgroundColor ?? event.bgColor ?? "",
		borderColor: event.borderColor ?? event.bgColor ?? "",
		editable: event.editable !== false,
		extendedProps: {
			...event.extendedProps, // ✅ Spread first
			type: event.extendedProps?.type ?? event.type ?? 0,
			cancelled: event.extendedProps?.cancelled ?? event.cancelled ?? false,
			customerName, // ✅ Then set customerName (won't be overwritten)
			// IMPORTANT: Do not fall back to id here; that breaks phone resolution
			waId:
				(event.extendedProps?.waId as string | undefined) ??
				(event.extendedProps as { wa_id?: string } | undefined)?.wa_id,
			...buildReservationIdProp(event),
			...buildSlotDateProp(slotDate),
			...buildSlotTimeProp(slotTime),
		},
	};
}
