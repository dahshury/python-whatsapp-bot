export type ReservationEventLike = {
	id?: string | number
	start?: string | null
	extendedProps?: Record<string, unknown> | null | undefined
}

/**
 * Derives a stable reservation identity used for locking and dedupe.
 * Prefers extendedProps.reservationId, then waId/wa_id/phone + start fallback.
 */
export function getReservationKey(
	ev: ReservationEventLike | null | undefined
): string {
	try {
		const ex = (ev?.extendedProps ?? undefined) as
			| Record<string, unknown>
			| undefined
		const reservationId = ex?.reservationId as string | number | undefined
		if (reservationId !== undefined && reservationId !== null) {
			return String(reservationId)
		}

		const wa =
			(ex?.waId as string | undefined) ||
			(ex?.wa_id as string | undefined) ||
			(ex?.phone as string | undefined) ||
			''
		const start = (ev?.start as string | undefined) || ''
		return `${wa}__${start}`
	} catch {
		return String(
			(ev as ReservationEventLike | undefined)?.id ??
				(ev as ReservationEventLike | undefined)?.start ??
				''
		)
	}
}
