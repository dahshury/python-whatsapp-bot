import { i18n } from "@shared/libs/i18n";

const MS_PER_SECOND = 1000;

export function formatTimeAgo(ts: number): string {
	const now = Date.now();
	const diffSec = Math.max(1, Math.floor((now - ts) / MS_PER_SECOND));
	if (diffSec < 60) {
		return i18n.messages.time.justNow();
	}
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) {
		return i18n.messages.time.minAgo(diffMin);
	}
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) {
		return i18n.messages.time.hoursAgo(diffHr);
	}
	const diffDay = Math.floor(diffHr / 24);
	return i18n.messages.time.daysAgo(diffDay);
}
