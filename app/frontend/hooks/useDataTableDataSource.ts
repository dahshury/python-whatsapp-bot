import { useMemo, useRef } from "react";
import { createDataSourceMapper } from "@/components/glide_custom_cells/components/services/DataSourceMapper";
import { getDataTableColumns } from "@/lib/constants/data-table-editor.constants";
import type { CalendarEvent } from "@/types/data-table-editor";

export function useDataTableDataSource(
	events: CalendarEvent[],
	selectedDateRange: { start: string; end: string } | null,
	slotDurationHours: number,
	freeRoam: boolean,
	isRTL: boolean,
	_open: boolean,
) {
	const gridRowToEventMapRef = useRef<Map<number, CalendarEvent>>(new Map());
	const mapper = useMemo(() => createDataSourceMapper<CalendarEvent>(), []);

	const dataSource = useMemo(() => {
		if (!selectedDateRange || events.length === 0) {
			const columns = getDataTableColumns(isRTL, selectedDateRange, freeRoam);
			return mapper.mapToDataSource(
				[],
				columns,
				{
					getValue: () => null,
				},
				{ minRows: 1, createDefaultsForEmpty: true },
			);
		}

		const columns = getDataTableColumns(isRTL, selectedDateRange, freeRoam);

		// Create mapping configuration
		const mappingConfig = {
			filter: (event: CalendarEvent) => {
				if (event.type === "conversation") {
					return false;
				}

				if (event.extendedProps?.cancelled && !freeRoam) {
					return false;
				}

				const eventStart = new Date(event.start);

				if (selectedDateRange.start.includes("T")) {
					const rangeStart = new Date(selectedDateRange.start);
					const rangeEnd = new Date(
						selectedDateRange.end || selectedDateRange.start,
					);

					if (rangeStart.getTime() === rangeEnd.getTime()) {
						rangeEnd.setHours(rangeEnd.getHours() + slotDurationHours);
					}

					return eventStart >= rangeStart && eventStart < rangeEnd;
				} else {
					const rangeStartDay = new Date(selectedDateRange.start);
					rangeStartDay.setHours(0, 0, 0, 0);

					let rangeEndDay: Date;
					if (
						selectedDateRange.end &&
						selectedDateRange.end !== selectedDateRange.start
					) {
						rangeEndDay = new Date(selectedDateRange.end);
						rangeEndDay.setHours(23, 59, 59, 999);
					} else {
						rangeEndDay = new Date(rangeStartDay);
						rangeEndDay.setHours(23, 59, 59, 999);
					}

					return eventStart >= rangeStartDay && eventStart <= rangeEndDay;
				}
			},

			sort: (a: CalendarEvent, b: CalendarEvent) => {
				const dateA = new Date(a.start);
				const dateB = new Date(b.start);
				return dateA.getTime() - dateB.getTime();
			},

			getValue: (event: CalendarEvent, columnId: string) => {
				const eventDate = new Date(event.start);
				// Prefer explicit extended phone; fall back to waId; never use generic id
				const getPhoneFromExtendedProps = (extendedProps: unknown): string => {
					if (!extendedProps || typeof extendedProps !== "object") return "";
					const obj = extendedProps as Record<string, unknown>;
					const val = obj.phone ?? obj.waId ?? obj.wa_id;
					return typeof val === "string" ? val : "";
				};
				let phoneNumber: string = getPhoneFromExtendedProps(
					event.extendedProps,
				);
				if (
					phoneNumber &&
					typeof phoneNumber === "string" &&
					!phoneNumber.startsWith("+")
				) {
					phoneNumber = `+${phoneNumber}`;
				}

				switch (columnId) {
					case "date":
						return eventDate.toISOString().split("T")[0];
					case "time":
						return eventDate.toTimeString().slice(0, 5);
					case "phone":
						return phoneNumber;
					case "type": {
						const type = event.extendedProps?.type || 0;
						return isRTL
							? type === 0
								? "كشف"
								: "مراجعة"
							: type === 0
								? "Check-up"
								: "Follow-up";
					}
					case "name":
						return event.title || event.extendedProps?.customerName || "";
					default:
						return null;
				}
			},
		};

		// Map to data source
		const dataSource = mapper.mapToDataSource(events, columns, mappingConfig, {
			minRows: 1,
			createDefaultsForEmpty: true,
		});

		// Update event map
		const filteredEvents = events
			.filter(mappingConfig.filter)
			.sort(mappingConfig.sort);
		const newEventMap = new Map<number, CalendarEvent>();
		filteredEvents.forEach((event, index) => {
			newEventMap.set(index, event);
		});
		gridRowToEventMapRef.current = newEventMap;

		return dataSource;
	}, [events, selectedDateRange, slotDurationHours, freeRoam, isRTL, mapper]);

	return {
		dataSource,
		gridRowToEventMapRef,
	};
}
