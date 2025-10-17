type IsVacationDate = ((ymd: string) => boolean) | undefined;

// Helper to format date as YYYY-MM-DD
function formatDateAsYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// Helper to check if any date in range is a vacation date
function hasVacationDateInRange(
	start: Date,
	end: Date | null,
	isVacationDate: (ymd: string) => boolean
): boolean {
	const cursor = new Date(start);
	while (true) {
		const ymd = formatDateAsYmd(cursor);
		if (isVacationDate(ymd)) {
			return true;
		}
		if (!end) {
			break;
		}
		const next = new Date(cursor);
		next.setDate(next.getDate() + 1);
		if (next >= end) {
			break;
		}
		cursor.setDate(cursor.getDate() + 1);
	}
	return false;
}

export function createEventAllow(args: { isVacationDate: IsVacationDate }) {
	const { isVacationDate } = args;
	return (info: { start?: Date; end?: Date }) => {
		try {
			if (!isVacationDate) {
				return true;
			}
			const start = info?.start ? new Date(info.start) : null;
			const end = info?.end ? new Date(info.end) : null;
			if (!start) {
				return true;
			}
			return !hasVacationDateInRange(start, end, isVacationDate);
		} catch {
			// Date validation may fail in some contexts
		}
		return true;
	};
}
