export type DataTableCalendarEvent = {
	id: string
	start?: string
	extendedProps?: Record<string, unknown>
}

export function getReservationKey(ev: DataTableCalendarEvent): string {
	try {
		const ex = ev?.extendedProps as Record<string, unknown> | undefined
		const rid = (ex?.reservationId as string | number | undefined) ?? undefined
		if (rid !== undefined && rid !== null) return String(rid)
		const wa =
			(ex?.waId as string | undefined) ||
			(ex?.wa_id as string | undefined) ||
			(ex?.phone as string | undefined) ||
			''
		const start = ev?.start || ''
		return `${wa}__${start}`
	} catch {
		return String((ev as { id?: unknown; start?: unknown })?.id ?? ev?.start ?? '')
	}
}


