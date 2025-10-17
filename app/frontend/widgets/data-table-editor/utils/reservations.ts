import type { CalendarEvent as DataTableCalendarEvent } from "@widgets/data-table-editor/types";

export function getReservationKey(ev: DataTableCalendarEvent): string {
	try {
		const ex = ev?.extendedProps as Record<string, unknown> | undefined;
		const rid = (ex?.reservationId as string | number | undefined) ?? undefined;
		if (rid !== undefined && rid !== null) {
			return String(rid);
		}
		const wa =
			(ex?.waId as string | undefined) ||
			(ex?.wa_id as string | undefined) ||
			(ex?.phone as string | undefined) ||
			"";
		const start = ev?.start || "";
		return `${wa}__${start}`;
	} catch {
		return String(ev?.id ?? ev?.start ?? "");
	}
}
