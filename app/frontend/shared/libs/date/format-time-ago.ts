import { i18n } from '@shared/libs/i18n'

const MILLISECONDS_PER_SECOND = 1000

export function formatTimeAgo(isLocalized: boolean, ts: number): string {
	const now = Date.now()
	const diffSec = Math.max(1, Math.floor((now - ts) / MILLISECONDS_PER_SECOND))
	if (diffSec < 60) {
		return i18n.getMessage('time_just_now', isLocalized)
	}
	const diffMin = Math.floor(diffSec / 60)
	if (diffMin < 60) {
		return `${diffMin} ${i18n.getMessage('time_minutes_ago', isLocalized)}`
	}
	const diffHr = Math.floor(diffMin / 60)
	if (diffHr < 24) {
		return `${diffHr} ${i18n.getMessage('time_hours_ago', isLocalized)}`
	}
	const diffDay = Math.floor(diffHr / 24)
	return `${diffDay} ${i18n.getMessage('time_days_ago', isLocalized)}`
}
