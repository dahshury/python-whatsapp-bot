// Shared comparators and helpers for calendar event ordering

/** Normalize type-like value to a number (default 0). */
export function normalizeType(value: unknown): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? (n as number) : 0;
}

/** Normalize name/title-like value to a string (default empty). */
export function normalizeTitle(value: unknown): string {
	return String(value ?? "").trim();
}

/**
 * Compare by reservation/event type, then by title/name (localeCompare).
 * Lower type precedes higher; for equal types, alphabetical by name.
 */
export function compareTypeThenTitle(
	aType: unknown,
	aName: unknown,
	bType: unknown,
	bName: unknown
): number {
	const t1 = normalizeType(aType);
	const t2 = normalizeType(bType);
	if (t1 !== t2) {
		return t1 - t2;
	}
	const n1 = normalizeTitle(aName);
	const n2 = normalizeTitle(bName);
	return n1.localeCompare(n2);
}

/**
 * Sort FullCalendar-like event objects in-place by type then title.
 * Expects objects to have `title?: string` and `extendedProps?.type?: unknown`.
 */
export function sortCalendarObjectsByTypeThenTitleInPlace<
	T extends {
		title?: string;
		extendedProps?: { type?: unknown };
	},
>(arr: T[]): T[] {
	return arr.sort((a, b) =>
		compareTypeThenTitle(
			a?.extendedProps?.type,
			a?.title,
			b?.extendedProps?.type,
			b?.title
		)
	);
}

/**
 * Sort reservation-group entries in-place by type then customer name/title.
 * Each entry is expected to be `{ r: { type?: unknown; customer_name?: string; title?: string } }`.
 */
export function sortReservationGroupByTypeThenNameInPlace<
	T extends {
		r: { type?: unknown; customer_name?: string; title?: string };
	},
>(arr: T[]): T[] {
	return arr.sort((a, b) =>
		compareTypeThenTitle(
			a?.r?.type,
			a?.r?.customer_name ?? a?.r?.title,
			b?.r?.type,
			b?.r?.customer_name ?? b?.r?.title
		)
	);
}
