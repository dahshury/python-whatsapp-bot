// Utility functions for vacation period calculations

export const normalizeDate = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dayAfterDate = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

export const dayBeforeDate = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);

export const periodOverlaps = (
	a: { start: Date; end: Date },
	b: { start: Date; end: Date }
) => {
	const s1 = normalizeDate(a.start).getTime();
	const e1 = normalizeDate(a.end).getTime();
	const s2 = normalizeDate(b.start).getTime();
	const e2 = normalizeDate(b.end).getTime();
	return Math.max(s1, s2) <= Math.min(e1, e2);
};

export const parseDateOnly = (value: string): Date => {
	try {
		const s = String(value || "");
		const dateOnly = s.includes("T") ? s.slice(0, 10) : s;
		const parts = dateOnly.split("-");
		const y = Number.parseInt(parts[0] || "", 10);
		const m = Number.parseInt(parts[1] || "", 10);
		const d = Number.parseInt(parts[2] || "", 10);
		if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
			return new Date(y, m - 1, d);
		}
		// Fallback: construct then normalize to local date-only
		const tmp = new Date(value);
		return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
	} catch {
		const tmp = new Date(value);
		return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
	}
};

export const isDateInPeriod = (
	d: Date,
	p: { start: Date; end: Date }
): boolean => {
	const dd = normalizeDate(d).getTime();
	const s = normalizeDate(p.start).getTime();
	const e = normalizeDate(p.end).getTime();
	return dd >= s && dd <= e;
};

export const findNextFreeDate = (
	startDate: Date,
	periods: { start: Date; end: Date }[]
): Date => {
	let candidate = normalizeDate(startDate);
	while (periods.some((p) => isDateInPeriod(candidate, p))) {
		// Jump to the day after the latest overlapping period's end
		let maxEnd = candidate;
		for (const p of periods) {
			if (isDateInPeriod(candidate, p)) {
				const endN = normalizeDate(p.end);
				if (endN.getTime() > maxEnd.getTime()) {
					maxEnd = endN;
				}
			}
		}
		candidate = new Date(
			maxEnd.getFullYear(),
			maxEnd.getMonth(),
			maxEnd.getDate() + 1
		);
	}
	return candidate;
};

const adjustEdgeForOverlap = (
	current: { start: Date; end: Date },
	other: { start: Date; end: Date },
	field: "start" | "end"
): void => {
	if (field === "start") {
		current.start = dayAfterDate(other.end);
		if (current.end < current.start) {
			current.end = new Date(current.start);
		}
	} else {
		current.end = dayBeforeDate(other.start);
		if (current.end < current.start) {
			current.start = new Date(current.end);
		}
	}
};

type ResolveOverlapsOptions = {
	currentIndex: number;
	editingField: "start" | "end";
	maxIterations: number;
};

// Resolve overlaps between a period and all others
export const resolveOverlaps = (
	current: { start: Date; end: Date },
	allPeriods: { start: Date; end: Date }[],
	options: ResolveOverlapsOptions
): void => {
	const { currentIndex, editingField, maxIterations } = options;
	let changed = true;
	let iterations = 0;
	while (changed && iterations < maxIterations) {
		changed = false;
		iterations += 1;
		for (let k = 0; k < allPeriods.length; k++) {
			if (k === currentIndex) {
				continue;
			}
			const other = allPeriods[k];
			if (other && periodOverlaps(current, other)) {
				adjustEdgeForOverlap(current, other, editingField);
				changed = true;
				break;
			}
		}
	}
};
