import type { CalendarEvent } from "@widgets/data-table-editor/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDataSourceMapper } from "@/shared/libs/data-grid/components/services/DataSourceMapper";
import { getDataTableColumns } from "@/widgets/data-table-editor/constants/data-table-editor.constants";

export function useDataTableDataSource(
	events: CalendarEvent[],
	selectedDateRange: { start: string; end: string } | null,
	slotDurationHours: number,
	freeRoam: boolean,
	open: boolean,
	isLocalized?: boolean
) {
	const gridRowToEventMapRef = useRef<Map<number, CalendarEvent>>(new Map());
	const mapper = useMemo(() => createDataSourceMapper<CalendarEvent>(), []);

	const _isLocalized = isLocalized ?? false;

	const previousEventsRef = useRef<CalendarEvent[]>([]);
	const previousConfigRef = useRef<string>("");

	const buildDataSource = useCallback(
		(currentEvents: CalendarEvent[], currentSelectedDateRange: { start: string; end: string } | null) => {
			const columns = getDataTableColumns(_isLocalized, currentSelectedDateRange, freeRoam);

			if (!currentSelectedDateRange || currentEvents.length === 0) {
				return mapper.mapToDataSource(
					[],
					columns,
					{ getValue: () => null },
					{ minRows: 1, createDefaultsForEmpty: true }
				);
			}

			const mappingConfig = {
				filter: (event: CalendarEvent) => {
					if (event.type === "conversation") return false;
					if (event.extendedProps?.cancelled && !freeRoam) return false;
					const eventStart = new Date(event.start);
					if (currentSelectedDateRange.start.includes("T")) {
						const rangeStart = new Date(currentSelectedDateRange.start);
						const rangeEnd = new Date(currentSelectedDateRange.end || currentSelectedDateRange.start);
						if (rangeStart.getTime() === rangeEnd.getTime()) {
							rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
						}
						return eventStart >= rangeStart && eventStart < rangeEnd;
					}
					const rangeStartDay = new Date(currentSelectedDateRange.start);
					rangeStartDay.setHours(0, 0, 0, 0);
					let rangeEndDay: Date;
					if (currentSelectedDateRange.end && currentSelectedDateRange.end !== currentSelectedDateRange.start) {
						rangeEndDay = new Date(currentSelectedDateRange.end);
						rangeEndDay.setHours(23, 59, 59, 999);
					} else {
						rangeEndDay = new Date(rangeStartDay);
						rangeEndDay.setHours(23, 59, 59, 999);
					}
					return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
				},
				sort: (a: CalendarEvent, b: CalendarEvent) => {
					const dateA = new Date(a.start);
					const dateB = new Date(b.start);
					return dateA.getTime() - dateB.getTime();
				},
				getValue: (event: CalendarEvent, columnId: string) => {
					const eventDate = new Date(event.start);
					const getPhoneFromExtendedProps = (extendedProps: unknown): string => {
						if (!extendedProps || typeof extendedProps !== "object") return "";
						const obj = extendedProps as Record<string, unknown>;
						const val = obj.phone ?? obj.waId ?? obj.wa_id;
						return typeof val === "string" ? val : "";
					};
					let phoneNumber: string = getPhoneFromExtendedProps(event.extendedProps);
					if (phoneNumber && typeof phoneNumber === "string" && !phoneNumber.startsWith("+")) {
						phoneNumber = `+${phoneNumber}`;
					}
					switch (columnId) {
						case "scheduled_time":
							return eventDate;
						case "phone":
							return phoneNumber;
						case "type": {
							const type = event.extendedProps?.type || 0;
							return _isLocalized ? (type === 0 ? "كشف" : "مراجعة") : type === 0 ? "Check-up" : "Follow-up";
						}
						case "name":
							return event.title || event.extendedProps?.customerName || "";
						default:
							return null;
					}
				},
			};

			const newDataSource = mapper.mapToDataSource(currentEvents, columns, mappingConfig, {
				minRows: 1,
				createDefaultsForEmpty: true,
			});

			const filteredEvents = currentEvents.filter(mappingConfig.filter).sort(mappingConfig.sort);
			const newEventMap = new Map<number, CalendarEvent>();
			filteredEvents.forEach((ev, idx) => {
				newEventMap.set(idx, ev);
			});
			gridRowToEventMapRef.current = newEventMap;

			return newDataSource;
		},
		[mapper, _isLocalized, freeRoam, slotDurationHours]
	);

	const [dataSource, setDataSource] = useState<ReturnType<typeof mapper.mapToDataSource>>(() =>
		buildDataSource(events, selectedDateRange)
	);

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
	}, [events, selectedDateRange, slotDurationHours, freeRoam, _isLocalized, open, buildDataSource]);

	return {
		dataSource,
		gridRowToEventMapRef,
	};
}

// Deep comparison function for events to detect actual changes
function areEventsEqual(prev: CalendarEvent[], current: CalendarEvent[]): boolean {
	if (prev.length !== current.length) return false;

	for (let i = 0; i < prev.length; i++) {
		const a = prev[i];
		const b = current[i];

		if (!a || !b) return false;

		// Compare key properties that affect grid display
		if (a.id !== b.id || a.title !== b.title || a.start !== b.start || a.end !== b.end || a.type !== b.type) {
			return false;
		}

		// Compare extended props that affect grid display
		const aExt = a.extendedProps || {};
		const bExt = b.extendedProps || {};

		if (
			aExt.customerName !== bExt.customerName ||
			aExt.phone !== bExt.phone ||
			aExt.waId !== bExt.waId ||
			aExt.type !== bExt.type ||
			aExt.cancelled !== bExt.cancelled ||
			aExt.reservationId !== bExt.reservationId
		) {
			return false;
		}
	}

	return true;
}
