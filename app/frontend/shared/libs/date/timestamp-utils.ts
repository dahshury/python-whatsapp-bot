import { TIME_FORMAT_REGEX } from '../toast/constants'

export function calculateTimestamp(date?: string, time?: string): number {
	try {
		if (!date) {
			return Date.now()
		}
		const dateStr = String(date).trim()
		const timeStr = String(time || '').trim()
		if (timeStr) {
			const m = TIME_FORMAT_REGEX.exec(timeStr)
			if (m) {
				const hour = Number.parseInt(m[1] || '0', 10)
				const minutes = m[2] || '00'
				const iso = `${dateStr}T${String(hour).padStart(2, '0')}:${minutes}:00`
				const d = new Date(iso)
				if (!Number.isNaN(d.getTime())) {
					return d.getTime()
				}
			}
		}
		// Fallback to date only at midnight
		const d = new Date(`${dateStr}T00:00:00`)
		if (!Number.isNaN(d.getTime())) {
			return d.getTime()
		}
	} catch {
		// Timestamp calculation failed - return current time
	}
	return Date.now()
}
