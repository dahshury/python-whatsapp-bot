/**
 * Calendar Customer Name Service
 *
 * Service for sanitizing and deriving customer names from multiple sources.
 * Handles name validation, placeholder detection, and fallback logic.
 */

import type { Reservation } from '@/entities/event'
import { isPlaceholderName, isSameAsWaId } from '@/shared/libs/customer-name'

export type CustomerNameEntry = {
	wa_id: string
	customer_name?: string | null
}

export type CustomerNamesMap = Record<string, CustomerNameEntry>

/**
 * Sanitizes customer names by filtering out invalid, placeholder, or WA ID-matching names.
 *
 * @param customerNames - Raw customer names map from API/hook
 * @returns Sanitized customer names map with only valid names
 */
export function sanitizeCustomerNames(
	customerNames: Record<string, { customer_name?: string | null } | undefined>
): CustomerNamesMap {
	const sanitized: CustomerNamesMap = {}
	for (const [waId, entry] of Object.entries(customerNames || {})) {
		const candidate = entry?.customer_name
		if (typeof candidate === 'string') {
			const trimmed = candidate.trim()
			if (
				trimmed &&
				!isSameAsWaId(trimmed, waId) &&
				!isPlaceholderName(trimmed)
			) {
				sanitized[waId] = { wa_id: waId, customer_name: trimmed }
				continue
			}
		}
		sanitized[waId] = { wa_id: waId }
	}
	return sanitized
}

/**
 * Derives customer names from reservation data when not available in customer names map.
 * Extracts names from reservation customer_name or title fields.
 *
 * @param sanitizedNames - Pre-sanitized customer names map
 * @param reservationsByCustomer - Reservations grouped by customer ID
 * @returns Enhanced customer names map with reservation-derived fallbacks
 */
export function deriveCustomerNamesFromReservations(
	sanitizedNames: CustomerNamesMap,
	reservationsByCustomer: Record<string, Reservation[]>
): CustomerNamesMap {
	const merged: CustomerNamesMap = { ...sanitizedNames }

	for (const [waId, reservations] of Object.entries(reservationsByCustomer)) {
		// Skip if name already exists
		if (merged[waId]?.customer_name) {
			continue
		}

		// Try to derive name from reservations
		const derivedName = reservations
			.map((reservation) => {
				const candidate =
					(reservation as { customer_name?: unknown }).customer_name ??
					(reservation as { title?: unknown }).title
				if (typeof candidate !== 'string') {
					return null
				}
				const trimmed = candidate.trim()
				if (
					trimmed.length === 0 ||
					isSameAsWaId(trimmed, waId) ||
					isPlaceholderName(trimmed)
				) {
					return null
				}
				return trimmed
			})
			.find((name): name is string => typeof name === 'string')

		if (derivedName) {
			merged[waId] = {
				wa_id: waId,
				customer_name: derivedName,
			}
		}
	}

	return merged
}
