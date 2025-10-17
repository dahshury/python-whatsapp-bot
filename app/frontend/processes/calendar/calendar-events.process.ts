import type { CalendarApi, CalendarEvent } from "@/entities/event";
import { CalendarDnDService } from "@/services/calendar/calendar-dnd.service";
import { WebSocketService } from "@/services/websocket/websocket.service";
import { LocalEchoManager } from "@/shared/libs/utils/local-echo.manager";
import type { CalendarEvent as DataTableEvent } from "@/widgets/data-table-editor/types";

/**
 * Filter events for calendar display based on free roam mode
 * In free roam mode, show all events including cancelled ones
 * In normal mode, filter out cancelled events
 */
export function filterEventsForCalendar(
	events: CalendarEvent[],
	freeRoam: boolean
): CalendarEvent[] {
	if (freeRoam) {
		// In free roam mode, show all events
		return events;
	}

	// In normal mode, filter out cancelled events
	return events.filter((event) => {
		const cancelled = event.extendedProps?.cancelled;
		return cancelled !== true;
	});
}

/**
 * Align and sort events for calendar display. For now this is a stable sort by start time.
 */
export function alignAndSortEventsForCalendar(
	events: CalendarEvent[],
	_freeRoam: boolean
): CalendarEvent[] {
	return [...(events || [])].sort((a, b) => {
		const ta = new Date(a.start).getTime();
		const tb = new Date(b.start).getTime();
		return ta - tb;
	});
}

/**
 * Adjust events for free roam behavior. Currently a pass-through to keep types consistent.
 */
export function processEventsForFreeRoam(
	events: CalendarEvent[],
	_freeRoam: boolean
): CalendarEvent[] {
	return events;
}

/**
 * Filter events specifically for the data-table editor use case
 * - Exclude conversation events
 * - Exclude cancelled events unless in freeRoam mode
 */
export function filterEventsForDataTable(
	events: CalendarEvent[],
	freeRoam: boolean
): CalendarEvent[];
export function filterEventsForDataTable(
	events: CalendarEvent[],
	_mode: string,
	freeRoam: boolean
): CalendarEvent[];
export function filterEventsForDataTable(
	events: CalendarEvent[],
	arg2: boolean | string,
	arg3?: boolean
): CalendarEvent[] {
	const freeRoam = typeof arg2 === "boolean" ? arg2 : Boolean(arg3);
	return events.filter((ev) => {
		const type = (ev as unknown as { type?: string }).type;
		const cancelled = ev.extendedProps?.cancelled;
		if (type === "conversation") {
			return false;
		}
		if (!freeRoam && cancelled === true) {
			return false;
		}
		return true;
	});
}

/**
 * Convert widget data-table row to a CalendarEvent
 */
export function convertDataTableRowToCalendarEvent(ev: {
	id: string;
	title: string;
	start: string;
	end?: string;
	extendedProps?: Record<string, unknown>;
}): CalendarEvent {
	return {
		id: ev.id,
		title: ev.title,
		start: ev.start,
		...(ev.end ? { end: ev.end } : {}),
		extendedProps: { ...(ev.extendedProps || {}) },
	};
}

/**
 * Transform entity CalendarEvent[] into DataTable editor events
 */
export function transformEventsForDataTable(
	events: CalendarEvent[]
): DataTableEvent[] {
	return (events || []).map((e) => {
		const ext = (e.extendedProps || {}) as Record<string, unknown>;
		const waId = (ext.waId ?? ext.wa_id) as string | undefined;
		const typeNumber = extractTypeNumber(ext);
		const out: DataTableEvent = {
			id: String(e.id),
			title: String((e as { title?: string }).title || ""),
			start: String(e.start),
			...(e.end ? { end: String(e.end) } : {}),
			type: "reservation",
			extendedProps: {
				...buildDescriptionProp(ext),
				...buildCustomerNameProp(ext),
				...buildPhoneProp(ext),
				...buildWaIdProp(waId),
				...buildTypeProp(typeNumber),
				...buildCancelledProp(ext),
				...buildReservationIdProp(ext),
			},
		};
		return out;
	});
}

function extractTypeNumber(ext: Record<string, unknown>): number | undefined {
	if (typeof ext.type === "number") {
		return ext.type as number;
	}
	const n = Number(ext.type);
	return Number.isFinite(n) ? (n as number) : undefined;
}

function buildDescriptionProp(
	ext: Record<string, unknown>
): Record<string, string> {
	return typeof ext.description === "string"
		? { description: ext.description as string }
		: {};
}

function buildCustomerNameProp(
	ext: Record<string, unknown>
): Record<string, string> {
	const customerName = (ext as { customerName?: string }).customerName;
	if (typeof customerName === "string") {
		return { customerName };
	}
	const customer_name = (ext as { customer_name?: string }).customer_name;
	if (typeof customer_name === "string") {
		return { customerName: customer_name };
	}
	return {};
}

function buildPhoneProp(ext: Record<string, unknown>): Record<string, string> {
	return typeof (ext as { phone?: string }).phone === "string"
		? { phone: (ext as { phone?: string }).phone as string }
		: {};
}

function buildWaIdProp(waId: string | undefined): Record<string, string> {
	return typeof waId === "string" && waId ? { waId } : {};
}

function buildTypeProp(typeNumber: number | undefined): Record<string, number> {
	return typeof typeNumber === "number" ? { type: typeNumber } : {};
}

function buildCancelledProp(
	ext: Record<string, unknown>
): Record<string, boolean> {
	return ext.cancelled === true ? { cancelled: true } : {};
}

function buildReservationIdProp(
	ext: Record<string, unknown>
): Record<string, number> {
	return typeof (ext as { reservationId?: number }).reservationId === "number"
		? {
				reservationId: (ext as { reservationId?: number })
					.reservationId as number,
			}
		: {};
}

/**
 * Orchestrate calendar drag and drop operations
 */
export async function orchestrateCalendarDrag(params: {
	calendarApi: CalendarApi;
	info: import("@/services/calendar/calendar-dnd.service").EventChangeInfo;
	isVacationDate: (date: string) => boolean;
	currentView: string;
	updateEvent: (
		id: string,
		event: { id: string; title?: string; start?: string; end?: string }
	) => void;
	resolveEvent: (
		id: string
	) => { extendedProps?: Record<string, unknown> } | undefined;
	isLocalized: boolean;
}): Promise<void> {
	const {
		calendarApi,
		info,
		isVacationDate,
		currentView,
		updateEvent,
		resolveEvent,
		isLocalized,
	} = params;

	const ws = new WebSocketService();
	const localEcho = new LocalEchoManager();
	const dnd = new CalendarDnDService(
		calendarApi as unknown as import("@/entities/event").CalendarApi,
		ws,
		localEcho,
		isLocalized
	);
	await dnd.handleEventChange({
		info,
		isVacationDate,
		currentView,
		updateEvent: updateEvent as (
			id: string,
			event: { id: string; title?: string; start?: string; end?: string }
		) => void,
		resolveEvent,
	});
}

/**
 * Cancel a single calendar event by id via the operation service.
 */
export async function orchestrateCancelReservation(params: {
	calendarApi: CalendarApi;
	eventId: string;
	events: CalendarEvent[];
	onEventCancelled?: (eventId: string) => void;
	isLocalized: boolean;
}): Promise<void> {
	const { calendarApi, eventId, events, onEventCancelled, isLocalized } =
		params;
	const { CalendarIntegrationService } = await import(
		"@/services/calendar/calendar-integration.service"
	);
	const { ReservationCancelService } = await import(
		"@/services/operations/reservation-cancel.service"
	);
	const ws = new WebSocketService();
	const { LocalEchoManager: LocalEchoManagerClass } = await import(
		"@/shared/libs/utils/local-echo.manager"
	);
	const localEcho = new LocalEchoManagerClass();
	const integration = new CalendarIntegrationService(
		calendarApi as unknown as import("@/entities/event").CalendarApi,
		localEcho
	);
	const svc = new ReservationCancelService(
		integration,
		localEcho,
		isLocalized,
		ws
	);

	// Map the specific event id to the grid-like API expected by the service
	const gridMap = new Map<number, CalendarEvent>();
	const found = events.find((e) => String(e.id) === String(eventId));
	if (!found) {
		return;
	}
	gridMap.set(0, found);

	await svc.processCancellations([0], gridMap, onEventCancelled);
}
