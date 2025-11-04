import type { EventApi } from '@fullcalendar/core'
import { DURATION_PER_RESERVATION_FEW, DURATION_PER_RESERVATION_MANY, GAP_MINUTES, MANY_EVENTS_THRESHOLD } from './constants'
import { getWindowProperty, setWindowProperty } from './window-utils'

export function reflowSlot(api: { getEvents?: () => unknown[] }, dateStr: string, baseTime: string): void {
	try {
		if (!api?.getEvents) {
			return
		}
		const all = api.getEvents() as unknown[]
		const inSlot = all.filter((e) => {
			const getExt = (key: string): unknown => {
				try {
					const ev = e as { extendedProps?: Record<string, unknown> }
					return ev.extendedProps ? ev.extendedProps[key] : undefined
				} catch {
					return undefined
				}
			}
			const t = Number(getExt('type') ?? 0)
			// Filter out conversation events (type 2)
			if (t === 2) return false
			// Filter out cancelled events
			if (getExt('cancelled') === true) return false
			const sd = getExt('slotDate')
			const st = getExt('slotTime')
			return sd === dateStr && st === baseTime
		})
		if (inSlot.length === 0) {
			return
		}
		// Sort by type first (checkups=0, followups=1), then alphabetically by title
		inSlot.sort((a, b) => {
			const ta = Number((a as { extendedProps?: { type?: unknown } }).extendedProps?.type ?? 0)
			const tb = Number((b as { extendedProps?: { type?: unknown } }).extendedProps?.type ?? 0)
			// Sort by type first
			if (ta !== tb) return ta - tb
			// Same type - sort alphabetically by title (case-insensitive)
			const na = String((a as { title?: string }).title || '').toLowerCase()
			const nb = String((b as { title?: string }).title || '').toLowerCase()
			return na.localeCompare(nb)
		})
	// Calculate duration per event based on slot occupancy
	const minutesPerReservation = inSlot.length >= MANY_EVENTS_THRESHOLD ? DURATION_PER_RESERVATION_MANY : DURATION_PER_RESERVATION_FEW
	const gapMinutes = GAP_MINUTES
	let offset = 0
	for (const ev of inSlot) {
		// Calculate start and end times as ISO strings to avoid timezone conversion issues
		// Parse baseTime (HH:MM or HH:MM:SS format)
		const timeParts = baseTime.split(':')
		const baseHours = Number(timeParts[0]) || 0
		const baseMinutes = Number(timeParts[1]) || 0
		
		// Calculate new start time in minutes
		const totalStartMinutes = baseHours * 60 + baseMinutes + Math.floor(offset)
		const startHours = Math.floor(totalStartMinutes / 60)
		const startMinutes = totalStartMinutes % 60
		
		// Calculate end time in minutes
		const totalEndMinutes = baseHours * 60 + baseMinutes + Math.floor(offset + minutesPerReservation)
		const endHours = Math.floor(totalEndMinutes / 60)
		const endMinutes = totalEndMinutes % 60
		
		// Format as ISO strings (no timezone info to stay in local time)
		const startStr = `${dateStr}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00`
		const endStr = `${dateStr}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
		
		try {
			const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0)
			setWindowProperty('__suppressEventChangeDepth', currentDepth + 1)
			// Use ISO strings directly instead of Date objects to avoid timezone conversions
			;(ev as unknown as EventApi).setDates(startStr, endStr)
		} catch { /* noop */ }
		setTimeout(() => {
			try {
				const d = getWindowProperty('__suppressEventChangeDepth', 0)
				if (d > 0) setWindowProperty('__suppressEventChangeDepth', d - 1)
			} catch { /* noop */ }
		}, 0)
		// Update slot metadata to ensure events stay grouped correctly
		try { (ev as unknown as EventApi).setExtendedProp('slotDate', dateStr) } catch { /* noop */ }
		try { (ev as unknown as EventApi).setExtendedProp('slotTime', baseTime) } catch { /* noop */ }
		// Add gap after each event (except implicitly after the last one)
		offset += minutesPerReservation + gapMinutes
	}
} catch { /* noop */ }
}


