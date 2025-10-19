// Shared utilities for date ranges, keys, and option builders used by websocket data flows

// Time constants
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_DAY =
	HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

// Prefetch window settings
export const PREFETCH_RANGE = 5; // prefetch ±5 neighbor ranges
export const PREFETCH_STALE_TIME_MS = 1 * MS_PER_MINUTE; // 1 minute

// Format a Date to YYYY-MM-DD
export function toIso(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

// Build a stable key for a date range request
export function computeRangeKey(range?: {
	fromDate?: string;
	toDate?: string;
	includeConversations?: boolean;
}): string {
	return range
		? `${range.fromDate ?? ""}|${range.toDate ?? ""}|${range.includeConversations ? 1 : 0}`
		: "__FULL__";
}

// Build a TanStack Query key for a date range bundle
export function rangeQueryKey(range?: {
	fromDate?: string;
	toDate?: string;
	includeConversations?: boolean;
}) {
	return [
		"range",
		range?.fromDate ?? "",
		range?.toDate ?? "",
		range?.includeConversations ? 1 : 0,
	] as const;
}

// Build REST options for reservations fetch
export function buildReservationOptions(range?: {
	fromDate?: string;
	toDate?: string;
}): {
	future?: boolean;
	includeCancelled?: boolean;
	fromDate?: string;
	toDate?: string;
} {
	return {
		future: false,
		includeCancelled: true,
		...(range?.fromDate ? { fromDate: range.fromDate } : {}),
		...(range?.toDate ? { toDate: range.toDate } : {}),
	};
}

// Build REST options for conversations fetch
export function buildConversationOptions(range?: {
	fromDate?: string;
	toDate?: string;
	includeConversations?: boolean;
}): { fromDate?: string; toDate?: string } | undefined {
	if (!range?.includeConversations) {
		return;
	}
	const out: { fromDate?: string; toDate?: string } = {};
	if (range?.fromDate) {
		out.fromDate = range.fromDate;
	}
	if (range?.toDate) {
		out.toDate = range.toDate;
	}
	return out;
}
