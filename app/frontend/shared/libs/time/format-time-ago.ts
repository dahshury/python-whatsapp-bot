export type TimeMessages = {
	justNow(): string
	minAgo(minutes: number): string
	hoursAgo(hours: number): string
	daysAgo(days: number): string
}

const SECONDS_IN_MINUTE = 60
const MINUTES_IN_HOUR = 60
const HOURS_IN_DAY = 24
const MILLISECONDS_IN_SECOND = 1000

export function formatTimeAgo(
	ts: number,
	messages: TimeMessages,
	now: number = Date.now()
): string {
	const diffSec = Math.max(1, Math.floor((now - ts) / MILLISECONDS_IN_SECOND))
	if (diffSec < SECONDS_IN_MINUTE) {
		return messages.justNow()
	}
	const diffMin = Math.floor(diffSec / SECONDS_IN_MINUTE)
	if (diffMin < MINUTES_IN_HOUR) {
		return messages.minAgo(diffMin)
	}
	const diffHr = Math.floor(diffMin / MINUTES_IN_HOUR)
	if (diffHr < HOURS_IN_DAY) {
		return messages.hoursAgo(diffHr)
	}
	const diffDay = Math.floor(diffHr / HOURS_IN_DAY)
	return messages.daysAgo(diffDay)
}
