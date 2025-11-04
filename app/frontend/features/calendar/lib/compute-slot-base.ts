import { getSlotTimes, SLOT_DURATION_HOURS } from '@shared/libs/calendar/calendar-config'
import { to24h } from '@shared/libs/utils'
import { DEFAULT_SLOT_HOURS, MIN_SLOT_MINUTES, SLOT_PREFIX_LEN } from './constants'

export function computeSlotBase(dateStr: string, timeSlotRaw: string): string {
	try {
		const baseTime = to24h(String(timeSlotRaw || '00:00'))
		const parts = baseTime.split(':')
		const hh = Number.parseInt(String(parts[0] ?? '0'), 10)
		const mm = Number.parseInt(String(parts[1] ?? '0'), 10)
		const minutes = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
		const day = new Date(`${dateStr}T00:00:00`)
		const { slotMinTime } = getSlotTimes(day, false, '') || { slotMinTime: '00:00:00' }
		const tparts = String(slotMinTime || '00:00:00')
			.slice(0, SLOT_PREFIX_LEN)
			.split(':')
		const sH = Number.parseInt(String(tparts[0] ?? '0'), 10)
		const sM = Number.parseInt(String(tparts[1] ?? '0'), 10)
		const minMinutes = (Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0)
		const duration = Math.max(MIN_SLOT_MINUTES, (SLOT_DURATION_HOURS || DEFAULT_SLOT_HOURS) * 60)
		const rel = Math.max(0, minutes - minMinutes)
		const slotIndex = Math.floor(rel / duration)
		const baseMinutes = minMinutes + slotIndex * duration
		const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, '0')
		const mmOut = String(baseMinutes % 60).padStart(2, '0')
		return `${hhOut}:${mmOut}`
	} catch {
		return to24h(String(timeSlotRaw || '00:00'))
	}
}


