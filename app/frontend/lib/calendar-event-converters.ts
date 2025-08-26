export function convertDataTableEventToCalendarEvent(event: any): any {
	if (!event) return event;
	const start = event.start || event.startDate || event.date || event.begin;
	const end = event.end || event.endDate || start;
	const slotDate =
		event.extendedProps?.slotDate ||
		(typeof start === "string" ? String(start).split("T")[0] : undefined);
	const slotTime =
		event.extendedProps?.slotTime ||
		(typeof start === "string"
			? String(start).split("T")[1]?.slice(0, 5)
			: undefined);
	return {
		id: String(event.id ?? event.reservationId ?? event.key ?? Math.random()),
		title: event.title ?? event.name ?? "",
		start,
		end,
		backgroundColor: event.backgroundColor ?? event.bgColor ?? "",
		borderColor: event.borderColor ?? event.bgColor ?? "",
		editable: event.editable !== false,
		extendedProps: {
			type: event.extendedProps?.type ?? event.type ?? 0,
			cancelled: event.extendedProps?.cancelled ?? event.cancelled ?? false,
			reservationId: event.extendedProps?.reservationId ?? event.reservationId,
			slotDate,
			slotTime,
			...event.extendedProps,
		},
	};
}
