import type { CalendarEvent } from "@widgets/data-table-editor/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDataSourceMapper } from "@/shared/libs/data-grid/components/services/data-source-mapper";
import { getDataTableColumns } from "@/widgets/data-table-editor/constants/data-table-editor.constants";

const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;

function getPhoneFromExtendedProps(extendedProps: unknown): string {
	if (!extendedProps || typeof extendedProps !== "object") {
		return "";
	}
	const obj = extendedProps as Record<string, unknown>;
	const candidates = [
		obj.phone,
		obj.waId,
		(obj as { wa_id?: unknown }).wa_id,
		(obj as { waid?: unknown }).waid,
		(obj as { phoneNumber?: unknown }).phoneNumber,
	];
	for (const c of candidates) {
		if (typeof c === "string" && c.trim().length > 0) {
			return c.trim();
		}
		if (typeof c === "number") {
			return String(c);
		}
	}
	return "";
}

function formatPhoneNumber(phoneNumber: string): string {
	if (phoneNumber && !phoneNumber.startsWith("+")) {
		return `+${phoneNumber}`;
	}
	return phoneNumber;
}

function filterEventByTimeRange(
	event: CalendarEvent,
	dateRange: { start: string; end: string },
	slotDurationHours: number,
	freeRoam: boolean
): boolean {
	// Never include conversation events in the data grid
	const marker = Number(
		(event.extendedProps as { type?: unknown } | undefined)?.type ??
			(event as unknown as { type?: unknown }).type ??
			Number.NaN
	);
	if (Number.isFinite(marker) && marker === 2) {
		return false;
	}
	if (event.type === "conversation") {
		return false;
	}
	if (event.extendedProps?.cancelled && !freeRoam) {
		return false;
	}

	const eventStart = new Date(event.start);

	if (dateRange.start.includes("T")) {
		const rangeStart = new Date(dateRange.start);
		const rangeEnd = new Date(dateRange.end || dateRange.start);
		if (rangeStart.getTime() === rangeEnd.getTime()) {
			rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
		}
		return eventStart >= rangeStart && eventStart < rangeEnd;
	}

	const rangeStartDay = new Date(dateRange.start);
	rangeStartDay.setHours(0, 0, 0, 0);

	const rangeEndDay = new Date(
		dateRange.end && dateRange.end !== dateRange.start
			? dateRange.end
			: dateRange.start
	);
	rangeEndDay.setHours(
		END_OF_DAY_HOUR,
		END_OF_DAY_MINUTE,
		END_OF_DAY_SECOND,
		END_OF_DAY_MILLISECOND
	);

	return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
}

function getEventValue(
	event: CalendarEvent,
	columnId: string,
	isLocalized: boolean
): unknown {
	const eventDate = new Date(event.start);
	let phoneNumber = getPhoneFromExtendedProps(event.extendedProps);
	const before = phoneNumber;
	phoneNumber = formatPhoneNumber(phoneNumber);
	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		`[DataSource] phone resolve: eventId=${event.id} candidates→resolved: "${before}"→"${phoneNumber}" | extendedProps:`,
		JSON.parse(JSON.stringify(event.extendedProps || {}))
	);

	switch (columnId) {
		case "scheduled_time":
			return eventDate;
		case "phone":
			return phoneNumber;
		case "type": {
			const type = event.extendedProps?.type || 0;
			if (isLocalized) {
				return type === 0 ? "كشف" : "مراجعة";
			}
			return type === 0 ? "Check-up" : "Follow-up";
		}
		case "name": {
			return resolveCustomerName(event);
		}
		default:
			return null;
	}
}

function resolveCustomerName(event: CalendarEvent): string {
	const explicitName = event.extendedProps?.customerName;
	if (typeof explicitName === "string" && explicitName.trim().length > 0) {
		return explicitName;
	}
	if (typeof event.title === "string" && event.title.trim().length > 0) {
		return event.title;
	}
	const waId =
		(event.extendedProps?.waId as string | undefined) ??
		((event.extendedProps as { wa_id?: string } | undefined)?.wa_id as
			| string
			| undefined) ??
		(event.id as string | undefined) ??
		"";
	const fallback = formatPhoneNumber(waId);
	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		`[DataSource] resolveCustomerName fallback used for eventId=${event.id}: waId="${waId}" → "${fallback}" | Full event:`,
		JSON.parse(JSON.stringify(event))
	);
	return fallback;
}

function getStabilizedNameValue(
	event: CalendarEvent,
	lastNameByIdRef: React.RefObject<Map<string, string>>
): string {
	const name = resolveCustomerName(event);
	if (name?.trim()) {
		const map = lastNameByIdRef.current;
		if (map) {
			map.set(String(event.id), name);
		}
		return name;
	}
	const prev = lastNameByIdRef.current?.get(String(event.id));
	if (prev?.trim()) {
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			`[DataSource] using stabilized previous name for eventId=${event.id}: "${prev}"`
		);
		return prev;
	}
	return name;
}

export function useDataTableDataSource(args: {
	events: CalendarEvent[];
	selectedDateRange: { start: string; end: string } | null;
	slotDurationHours: number;
	freeRoam: boolean;
	open: boolean;
	isLocalized?: boolean;
}) {
	const {
		events,
		selectedDateRange,
		slotDurationHours,
		freeRoam,
		open,
		isLocalized: isLocalizedArg,
	} = args;
	const gridRowToEventMapRef = useRef<Map<number, CalendarEvent>>(new Map());
	const lastNameByIdRef = useRef<Map<string, string>>(new Map());
	const mapper = useMemo(() => createDataSourceMapper<CalendarEvent>(), []);

	const _isLocalized = isLocalizedArg ?? false;

	const previousEventsRef = useRef<CalendarEvent[]>([]);
	const previousConfigRef = useRef<string>("");

	const buildDataSource = useCallback(
		(
			currentEvents: CalendarEvent[],
			currentSelectedDateRange: { start: string; end: string } | null
		) => {
			const columns = getDataTableColumns(
				_isLocalized,
				currentSelectedDateRange,
				freeRoam
			);

			if (!currentSelectedDateRange || currentEvents.length === 0) {
				return mapper.mapToDataSource(
					[],
					columns,
					{ getValue: () => null },
					{ minRows: 1, createDefaultsForEmpty: true }
				);
			}

			const mappingConfig = {
				filter: (event: CalendarEvent) =>
					filterEventByTimeRange(
						event,
						currentSelectedDateRange,
						slotDurationHours,
						freeRoam
					),
				sort: (a: CalendarEvent, b: CalendarEvent) => {
					const dateA = new Date(a.start);
					const dateB = new Date(b.start);
					return dateA.getTime() - dateB.getTime();
				},
				getValue: (event: CalendarEvent, columnId: string) =>
					columnId === "name"
						? getStabilizedNameValue(event, lastNameByIdRef)
						: getEventValue(event, columnId, _isLocalized),
			};

			const newDataSource = mapper.mapToDataSource(
				currentEvents,
				columns,
				mappingConfig,
				{
					minRows: 1,
					createDefaultsForEmpty: true,
				}
			);

			const filteredEvents = currentEvents
				.filter(mappingConfig.filter)
				.sort(mappingConfig.sort);
			const newEventMap = new Map<number, CalendarEvent>();
			filteredEvents.forEach((ev, idx) => {
				newEventMap.set(idx, ev);
			});
			gridRowToEventMapRef.current = newEventMap;

			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.("[DataSource] gridRowToEventMap", {
				rows: filteredEvents.map((ev, idx) => ({
					row: idx,
					eventId: ev.id,
					waId:
						(ev.extendedProps?.waId as string | undefined) ??
						((ev.extendedProps as { wa_id?: string } | undefined)?.wa_id as
							| string
							| undefined) ??
						ev.id,
					start: ev.start,
				})),
			});

			return newDataSource;
		},
		[mapper, _isLocalized, freeRoam, slotDurationHours]
	);

	const [dataSource, setDataSource] = useState<
		ReturnType<typeof mapper.mapToDataSource>
	>(() => buildDataSource(events, selectedDateRange));

	useEffect(() => {
		const configHash = JSON.stringify({
			selectedDateRange,
			slotDurationHours,
			freeRoam,
			isLocalized: _isLocalized,
			eventsLength: events.length,
		});

		const eventsChanged = !areEventsEqual(previousEventsRef.current, events);
		const configChanged = previousConfigRef.current !== configHash;

		if ((eventsChanged || configChanged) && open) {
			const ds = buildDataSource(events, selectedDateRange);
			setDataSource(ds);
			previousEventsRef.current = [...events];
			previousConfigRef.current = configHash;
		}
	}, [
		events,
		selectedDateRange,
		slotDurationHours,
		freeRoam,
		_isLocalized,
		open,
		buildDataSource,
	]);

	return {
		dataSource,
		gridRowToEventMapRef,
	};
}

// Deep comparison function for events to detect actual changes
function areEventsEqual(
	prev: CalendarEvent[],
	current: CalendarEvent[]
): boolean {
	if (prev.length !== current.length) {
		return false;
	}

	for (let i = 0; i < prev.length; i++) {
		const a = prev[i];
		const b = current[i];

		if (!(a && b)) {
			return false;
		}

		// Compare key properties that affect grid display
		if (
			a.id !== b.id ||
			a.title !== b.title ||
			a.start !== b.start ||
			a.end !== b.end ||
			a.type !== b.type
		) {
			return false;
		}

		// Compare extended props that affect grid display
		const aExt = a.extendedProps || {};
		const bExt = b.extendedProps || {};

		if (
			(aExt as { customerName?: unknown }).customerName !==
				(bExt as { customerName?: unknown }).customerName ||
			(aExt as { phone?: unknown }).phone !==
				(bExt as { phone?: unknown }).phone ||
			(aExt as { waId?: unknown }).waId !== (bExt as { waId?: unknown }).waId ||
			(aExt as { type?: unknown }).type !== (bExt as { type?: unknown }).type ||
			(aExt as { cancelled?: unknown }).cancelled !==
				(bExt as { cancelled?: unknown }).cancelled ||
			(aExt as { reservationId?: unknown }).reservationId !==
				(bExt as { reservationId?: unknown }).reservationId
		) {
			return false;
		}
	}

	return true;
}
