import {
	getMessageDate,
	getReservationDate,
} from '@/features/dashboard/model/normalize'
import type {
	DashboardConversationMessage,
	DashboardReservation,
} from '@/features/dashboard/types'
import {
	type ActiveRange,
	isWithinPrevRange,
	isWithinRange,
} from '@/shared/libs/date/range'

export type Entries<T> = [string, T[]][]

export function filterByRange(
	entries: Entries<DashboardReservation>,
	activeRange?: ActiveRange
): Entries<DashboardReservation> {
	return entries.map(([id, items]) => [
		id,
		(Array.isArray(items) ? items : []).filter((r) =>
			isWithinRange(getReservationDate(r), activeRange)
		),
	])
}

export function filterPrevByRange(
	entries: Entries<DashboardReservation>,
	activeRange?: ActiveRange
): Entries<DashboardReservation> {
	return entries.map(([id, items]) => [
		id,
		(Array.isArray(items) ? items : []).filter((r) =>
			isWithinPrevRange(getReservationDate(r), activeRange)
		),
	])
}

export function filterMsgsByRange(
	entries: Entries<DashboardConversationMessage>,
	activeRange?: ActiveRange
): Entries<DashboardConversationMessage> {
	return entries.map(([id, msgs]) => [
		id,
		(Array.isArray(msgs) ? msgs : []).filter((m) =>
			isWithinRange(getMessageDate(m), activeRange)
		),
	])
}

export function filterPrevMsgsByRange(
	entries: Entries<DashboardConversationMessage>,
	activeRange?: ActiveRange
): Entries<DashboardConversationMessage> {
	return entries.map(([id, msgs]) => [
		id,
		(Array.isArray(msgs) ? msgs : []).filter((m) =>
			isWithinPrevRange(getMessageDate(m), activeRange)
		),
	])
}

export function countTotalReservations(
	entries: Entries<DashboardReservation>
): number {
	return entries.reduce(
		(sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0),
		0
	)
}

export function countReturningCustomers(
	entries: Entries<DashboardReservation>
): number {
	return entries.reduce(
		(count, [, items]) =>
			count + (Array.isArray(items) && items.length > 1 ? 1 : 0),
		0
	)
}

export function countUniqueCustomersFirstReservation(
	allEntries: Entries<DashboardReservation>,
	activeRange?: ActiveRange
): number {
	const firstReservationDateByCustomer = new Map<string, Date | null>()
	for (const [id, items] of allEntries) {
		const first = (Array.isArray(items) ? items : [])
			.map((r) => getReservationDate(r))
			.filter(Boolean)
			.sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as
			| Date
			| undefined
		firstReservationDateByCustomer.set(id, first ?? null)
	}
	let count = 0
	for (const d of firstReservationDateByCustomer.values()) {
		if (isWithinRange(d, activeRange)) {
			count += 1
		}
	}
	return count
}

export function countPrevUniqueCustomersFirstReservation(
	allEntries: Entries<DashboardReservation>,
	activeRange?: ActiveRange
): number {
	const firstReservationDateByCustomer = new Map<string, Date | null>()
	for (const [id, items] of allEntries) {
		const first = (Array.isArray(items) ? items : [])
			.map((r) => getReservationDate(r))
			.filter(Boolean)
			.sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as
			| Date
			| undefined
		firstReservationDateByCustomer.set(id, first ?? null)
	}
	let count = 0
	for (const d of firstReservationDateByCustomer.values()) {
		if (isWithinPrevRange(d, activeRange)) {
			count += 1
		}
	}
	return count
}

export function computeConversionRate(
	filteredReservations: Entries<DashboardReservation>,
	filteredMessages: Entries<DashboardConversationMessage>
): number {
	const chattedIds = new Set<string>(
		filteredMessages
			.filter(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0)
			.map(([id]) => id)
	)
	const reservedIds = new Set<string>(
		filteredReservations
			.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0)
			.map(([id]) => id)
	)
	const den = chattedIds.size
	let num = 0
	for (const id of chattedIds) {
		if (reservedIds.has(id)) {
			num += 1
		}
	}
	const PERCENT = 100
	return den > 0 ? Math.min(PERCENT, (num / den) * PERCENT) : 0
}

export function computeAvgFollowups(
	entries: Entries<DashboardReservation>
): number {
	const returningCounts = entries
		.map(([, items]) => (Array.isArray(items) ? items.length : 0))
		.filter((len) => len > 1)
		.map((len) => len - 1)
	if (returningCounts.length === 0) {
		return 0
	}
	const total = returningCounts.reduce((a, b) => a + b, 0)
	return total / returningCounts.length
}
